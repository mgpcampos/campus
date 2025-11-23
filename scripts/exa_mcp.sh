#!/usr/bin/env bash
# Exa MCP reference implementation in Bash.
# Implements all eight Exa MCP tools and exposes them via the MCP stdio transport
# as well as direct CLI subcommands for running searches with curl-based API calls.

set -euo pipefail
if [[ -f .env ]]; then
    source .env
fi
LC_ALL=C

SERVER_NAME="exa-bash"
SERVER_VERSION="0.1.0"
PROTOCOL_VERSION="2024-11-05"
EXA_BASE_URL="https://api.exa.ai"
DEFAULT_NUM_RESULTS="${EXA_DEFAULT_NUM_RESULTS:-8}"
DEFAULT_MAX_CHARACTERS="${EXA_DEFAULT_MAX_CHARACTERS:-2000}"
DEFAULT_CONTEXT_MAX="${EXA_CONTEXT_MAX:-10000}"
DEFAULT_TIMEOUT="${EXA_REQUEST_TIMEOUT:-25}"
DEFAULT_LIVECRAWL="${EXA_LIVECRAWL_MODE:-fallback}"
DEFAULT_RESEARCH_MODEL="${EXA_RESEARCH_MODEL:-exa-research}"
SERVER_INSTRUCTIONS=$'This Bash server mirrors https://github.com/exa-labs/exa-mcp-server.\nSet EXA_API_KEY or pass --api-key. Tools can also be executed directly via CLI subcommands.\nDocs reference: https://docs.exa.ai/reference/getting-started and https://docs.exa.ai/reference/quickstart#curl.'

API_KEY="${EXA_API_KEY:-}"
ENABLED_TOOLS_INPUT="${EXA_TOOLS:-}"
LOG_LEVEL="${EXA_LOG_LEVEL:-info}"
REQUEST_TIMEOUT="$DEFAULT_TIMEOUT"
MODE=""

declare -a POSITIONAL=()

if ! [[ "$DEFAULT_NUM_RESULTS" =~ ^[0-9]+$ ]]; then
	DEFAULT_NUM_RESULTS=8
fi

if ! [[ "$DEFAULT_MAX_CHARACTERS" =~ ^[0-9]+$ ]]; then
	DEFAULT_MAX_CHARACTERS=2000
fi

if ! [[ "$DEFAULT_CONTEXT_MAX" =~ ^[0-9]+$ ]]; then
	DEFAULT_CONTEXT_MAX=10000
fi

if ! [[ "$REQUEST_TIMEOUT" =~ ^[0-9]+$ ]]; then
	REQUEST_TIMEOUT=25
fi

print_help() {
	cat <<'EOF'
Exa CLI (API-backed)
Usage:
	exa_mcp.sh --help
	exa_mcp.sh web-search --query "..."             # Run a web search via CLI
  exa_mcp.sh deep-search --objective "..." --variant "query" [--variant ...]
  exa_mcp.sh code-search --query "React hooks" [--tokens 8000]
  exa_mcp.sh crawling --url https://example.com   # Crawl a specific URL
  exa_mcp.sh company-research --company "Name"    # Company research
  exa_mcp.sh linkedin-search --query "Person"     # LinkedIn-focused search
  exa_mcp.sh deep-research-start --instructions "..."
  exa_mcp.sh deep-research-check --task-id TASK_ID

Global options:
	--api-key KEY             Provide Exa API key (or set EXA_API_KEY)
  --tools t1,t2             Enable subset of MCP tools (default: web_search_exa,get_code_context_exa)
  --log-level info|debug    Adjust logging verbosity (default: info)
  --timeout seconds         Override curl timeout per request (default: 25)
  -h, --help                Show this help text and exit

Environment variables:
  EXA_API_KEY               Default API key for Exa requests
  EXA_TOOLS                 Comma-separated list of tools to enable for MCP mode
  EXA_LOG_LEVEL             info or debug
  EXA_DEFAULT_NUM_RESULTS   Default search result count (numeric)
  EXA_DEFAULT_MAX_CHARACTERS  Default crawl character budget
  EXA_CONTEXT_MAX           Default context length for web search
  EXA_REQUEST_TIMEOUT       Timeout for curl requests (seconds)
  EXA_LIVECRAWL_MODE        fallback|preferred (web search default)
  EXA_RESEARCH_MODEL        exa-research|exa-research-pro default for deep researcher start
EOF
}

normalize_tools_input() {
	local raw="$1"
	local -a parsed=()
	IFS=',' read -r -a parsed <<<"$raw"
	local item normalized
	REQUESTED_TOOLS=()
	for item in "${parsed[@]}"; do
		normalized="${item//[[:space:]]/}"
		if [[ -n "$normalized" ]]; then
			REQUESTED_TOOLS+=("$normalized")
		fi
	done
}

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Required command '$1' is not available" >&2
		exit 1
	fi
}

log_debug() {
	if [[ "$LOG_LEVEL" == "debug" ]]; then
		printf '[debug] %s\n' "$*" >&2
	fi
}

set_tool_result() {
	TOOL_RESULT_TEXT="$1"
	TOOL_RESULT_IS_ERROR="$2"
}

TOOL_RESULT_TEXT=""
TOOL_RESULT_IS_ERROR=0

build_text_result() {
	local text="$1"
	local is_error="${2:-0}"
	if [[ "$is_error" -eq 1 ]]; then
		jq -Rn --arg txt "$text" '{content:[{type:"text",text:$txt}],isError:true}'
	else
		jq -Rn --arg txt "$text" '{content:[{type:"text",text:$txt}]}'
	fi
}

require_api_key() {
	if [[ -z "$API_KEY" ]]; then
		set_tool_result "Missing Exa API key. Set EXA_API_KEY or use --api-key." 1
		return 1
	fi
	return 0
}

HTTP_STATUS=0
HTTP_BODY=""

tmpfile() {
	mktemp 2>/dev/null || mktemp -t exa_mcp
}

exa_request() {
	local method="$1"
	local path="$2"
	local data="${3:-}"
	local tmp
	tmp=$(tmpfile)
	local url="$EXA_BASE_URL$path"
	local -a args
	args=(-sS -o "$tmp" -w '%{http_code}' -X "$method" "$url" -H 'accept: application/json' -H "user-agent: $SERVER_NAME/$SERVER_VERSION")
	if [[ -n "$API_KEY" ]]; then
		args+=(-H "x-api-key: $API_KEY")
	fi
	if [[ "$method" != "GET" ]]; then
		args+=(-H 'content-type: application/json' --data "$data")
	fi
	HTTP_STATUS=$(curl "${args[@]}" --max-time "$REQUEST_TIMEOUT" 2> >(cat >&2)) || {
		HTTP_STATUS=0
		HTTP_BODY=""
		rm -f "$tmp"
		return 1
	}
	HTTP_BODY=$(cat "$tmp")
	rm -f "$tmp"
	log_debug "HTTP $HTTP_STATUS $path"
	return 0
}

extract_api_error() {
	local action="$1"
	local status="$2"
	local body="$3"
	local message
	message=$(jq -r '
		if type=="object" then
			if has("message") then .message
			elif (.error?|has("message")) then .error.message
			else ""
			end
		else ""
		end' <<<"$body" 2>/dev/null || true)
	if [[ -z "$message" || "$message" == "null" ]]; then
		local snippet=${body:0:200}
		message="HTTP $status error${snippet:+ – $snippet}"
	else
		message="$message (HTTP $status)"
	fi
	printf '%s failed: %s' "$action" "$message"
}

format_json_or_raw() {
	local raw="$1"
	local formatted
	if formatted=$(jq '.' <<<"$raw" 2>/dev/null); then
		printf '%s' "$formatted"
	else
		printf '%s' "$raw"
	fi
}

validate_positive_int() {
	local value="$1"
	local fallback="$2"
	if [[ -z "$value" ]]; then
		printf '%s' "$fallback"
		return
	fi
	if [[ "$value" =~ ^[0-9]+$ ]]; then
		printf '%s' "$value"
		return
	fi
	printf '%s' "$fallback"
}

validate_livecrawl() {
	local value="$1"
	if [[ "$value" == "preferred" ]]; then
		printf 'preferred'
	else
		printf 'fallback'
	fi
}

# -----------------------------
# Tool execution helpers
# -----------------------------

perform_web_search() {
	local query="$1"
	local num_results="$(validate_positive_int "$2" "$DEFAULT_NUM_RESULTS")"
	local livecrawl="$(validate_livecrawl "${3:-$DEFAULT_LIVECRAWL}")"
	local search_type="${4:-auto}"
	local context_max="$(validate_positive_int "$5" "$DEFAULT_CONTEXT_MAX")"

	if [[ -z "$query" ]]; then
		set_tool_result "'query' is required for web_search_exa" 1
		return 1
	fi
	require_api_key || return 1

	local payload
	payload=$(jq -n \
		--arg query "$query" \
		--arg type "$search_type" \
		--arg livecrawl "$livecrawl" \
		--argjson numResults "$num_results" \
		--argjson maxChars "$context_max" \
		'{
      query:$query,
      type:$type,
      numResults:$numResults,
      contents:{
        text:true,
        context:{maxCharacters:$maxChars},
        livecrawl:$livecrawl
      }
    }')

	if ! exa_request POST "/search" "$payload"; then
		set_tool_result "Unable to reach Exa search endpoint." 1
		return 1
	fi

	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		local context
		if ! context=$(jq -r '.context // empty' <<<"$HTTP_BODY" 2>/dev/null); then
			context=""
		fi
		if [[ -z "$context" ]]; then
			set_tool_result "No search context returned." 1
			return 1
		fi
		set_tool_result "$context" 0
		return 0
	fi

	set_tool_result "$(extract_api_error "Web search" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_deep_search() {
	local objective="$1"
	local query_variants_json="$2"
	local num_results="$(validate_positive_int "$3" 10)"
	local livecrawl="$(validate_livecrawl "${4:-$DEFAULT_LIVECRAWL}")"

	if [[ -z "$objective" ]]; then
		set_tool_result "'objective' is required for deep_search_exa" 1
		return 1
	fi
	require_api_key || return 1

	if [[ -z "$query_variants_json" || "$query_variants_json" == "[]" ]]; then
		query_variants_json=$(jq -n --arg objective "$objective" '[$objective]')
	fi

	local payload
	payload=$(jq -n \
		--arg objective "$objective" \
		--arg livecrawl "$livecrawl" \
		--argjson numResults "$num_results" \
		--argjson variants "$query_variants_json" \
		'{
      query:$objective,
      type:"deep",
      numResults:$numResults,
      contents:{text:false,summary:true,livecrawl:$livecrawl},
      queryVariants:$variants
    }')

	if ! exa_request POST "/search" "$payload"; then
		set_tool_result "Unable to reach Exa search endpoint." 1
		return 1
	fi

	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		set_tool_result "$(format_json_or_raw "$HTTP_BODY")" 0
		return 0
	fi

	set_tool_result "$(extract_api_error "Deep search" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_company_research() {
	local company="$1"
	local num_results="$(validate_positive_int "$2" "$DEFAULT_NUM_RESULTS")"
	if [[ -z "$company" ]]; then
		set_tool_result "'companyName' is required for company_research_exa" 1
		return 1
	fi
	require_api_key || return 1
	local payload
	payload=$(jq -n \
		--arg query "$company company business corporation information news financial" \
		--argjson numResults "$num_results" \
		--argjson maxChars "$DEFAULT_MAX_CHARACTERS" \
		'{
      query:$query,
      type:"auto",
      numResults:$numResults,
      contents:{
        text:{maxCharacters:$maxChars},
        livecrawl:"preferred"
      },
      includeDomains:[
        "bloomberg.com","reuters.com","crunchbase.com","sec.gov","linkedin.com","forbes.com","businesswire.com","prnewswire.com"
      ]
    }')

	if ! exa_request POST "/search" "$payload"; then
		set_tool_result "Unable to reach Exa search endpoint." 1
		return 1
	fi

	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		set_tool_result "$(format_json_or_raw "$HTTP_BODY")" 0
		return 0
	fi

	set_tool_result "$(extract_api_error "Company research" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_crawling() {
	local url="$1"
	local max_chars="$(validate_positive_int "$2" "$DEFAULT_MAX_CHARACTERS")"
	if [[ -z "$url" ]]; then
		set_tool_result "'url' is required for crawling_exa" 1
		return 1
	fi
	require_api_key || return 1
	local payload
	payload=$(jq -n --arg url "$url" --argjson maxChars "$max_chars" '{ids:[$url],contents:{text:{maxCharacters:$maxChars},livecrawl:"preferred"}}')
	if ! exa_request POST "/contents" "$payload"; then
		set_tool_result "Unable to reach Exa contents endpoint." 1
		return 1
	fi
	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		set_tool_result "$(format_json_or_raw "$HTTP_BODY")" 0
		return 0
	fi
	set_tool_result "$(extract_api_error "Crawling" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_linkedin_search() {
	local query="$1"
	local search_type="$2"
	local num_results="$(validate_positive_int "$3" "$DEFAULT_NUM_RESULTS")"
	if [[ -z "$query" ]]; then
		set_tool_result "'query' is required for linkedin_search_exa" 1
		return 1
	fi
	require_api_key || return 1
	local decorated="$query LinkedIn"
	case "$search_type" in
	profiles)
		decorated="$query LinkedIn profile"
		;;
	companies)
		decorated="$query LinkedIn company"
		;;
	esac
	local payload
	payload=$(jq -n \
		--arg query "$decorated" \
		--argjson numResults "$num_results" \
		--argjson maxChars "$DEFAULT_MAX_CHARACTERS" \
		'{
      query:$query,
      type:"neural",
      numResults:$numResults,
      contents:{text:{maxCharacters:$maxChars},livecrawl:"preferred"},
      includeDomains:["linkedin.com"]
    }')
	if ! exa_request POST "/search" "$payload"; then
		set_tool_result "Unable to reach Exa search endpoint." 1
		return 1
	fi
	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		set_tool_result "$(format_json_or_raw "$HTTP_BODY")" 0
		return 0
	fi
	set_tool_result "$(extract_api_error "LinkedIn search" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_code_context() {
	local query="$1"
	local tokens="$2"
	local tokens_valid
	tokens_valid=$(validate_positive_int "$tokens" 5000)
	if ((tokens_valid < 1000)); then
		tokens_valid=1000
	elif ((tokens_valid > 50000)); then
		tokens_valid=50000
	fi
	if [[ -z "$query" ]]; then
		set_tool_result "'query' is required for get_code_context_exa" 1
		return 1
	fi
	require_api_key || return 1
	local payload
	payload=$(jq -n --arg query "$query" --argjson tokens "$tokens_valid" '{query:$query,tokensNum:$tokens}')
	if ! exa_request POST "/context" "$payload"; then
		set_tool_result "Unable to reach Exa context endpoint." 1
		return 1
	fi
	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		local response_field
		if ! response_field=$(jq -r 'if .response then .response else empty end' <<<"$HTTP_BODY" 2>/dev/null); then
			response_field=""
		fi
		if [[ -z "$response_field" || "$response_field" == "null" ]]; then
			set_tool_result "$(format_json_or_raw "$HTTP_BODY")" 0
			return 0
		fi
		set_tool_result "$response_field" 0
		return 0
	fi
	set_tool_result "$(extract_api_error "Code context" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_deep_research_start() {
	local instructions="$1"
	local model="$2"
	if [[ -z "$instructions" ]]; then
		set_tool_result "'instructions' are required for deep_researcher_start" 1
		return 1
	fi
	require_api_key || return 1
	if [[ "$model" != "exa-research" && "$model" != "exa-research-pro" ]]; then
		model="$DEFAULT_RESEARCH_MODEL"
	fi
	local payload
	payload=$(jq -n --arg model "$model" --arg instructions "$instructions" '{model:$model,instructions:$instructions,output:{inferSchema:false}}')
	if ! exa_request POST "/research/v0/tasks" "$payload"; then
		set_tool_result "Unable to reach Exa research endpoint." 1
		return 1
	fi
	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		local id
		if ! id=$(jq -r '.id // empty' <<<"$HTTP_BODY" 2>/dev/null); then
			id=""
		fi
		if [[ -z "$id" ]]; then
			set_tool_result "Research task started but response lacked task ID." 1
			return 1
		fi
		local summary
		summary=$(jq -n --arg taskId "$id" --arg model "$model" --arg instructions "$instructions" '{success:true,taskId:$taskId,model:$model,instructions:$instructions,nextStep:("Call deep_researcher_check with taskId: " + $taskId)}')
		set_tool_result "$summary" 0
		return 0
	fi
	set_tool_result "$(extract_api_error "Deep researcher start" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

perform_deep_research_check() {
	local task_id="$1"
	if [[ -z "$task_id" ]]; then
		set_tool_result "'taskId' is required for deep_researcher_check" 1
		return 1
	fi
	require_api_key || return 1
	sleep 5
	if ! exa_request GET "/research/v0/tasks/$task_id"; then
		set_tool_result "Unable to reach Exa research endpoint." 1
		return 1
	fi
	if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
		local status
		if ! status=$(jq -r '.status // empty' <<<"$HTTP_BODY" 2>/dev/null); then
			status=""
		fi
		local result
		case "$status" in
		completed)
			if ! result=$(jq '{success:true,status:.status,taskId:.id,report:(.data.report // "No report generated"),timeMs:.timeMs,model:.model}' <<<"$HTTP_BODY" 2>/dev/null); then
				result=$(jq -n --arg taskId "$task_id" '{success:true,status:"completed",taskId:$taskId,report:"Completed",message:"Research completed."}')
			fi
			;;
		running)
			result=$(jq -n --arg taskId "$task_id" '{success:true,status:"running",taskId:$taskId,message:"Research in progress. Poll again."}')
			;;
		failed)
			if ! result=$(jq '{success:false,status:.status,taskId:.id,message:(.error.message // "Research task failed. Try restarting.")}' <<<"$HTTP_BODY" 2>/dev/null); then
				result=$(jq -n --arg taskId "$task_id" '{success:false,status:"failed",taskId:$taskId,message:"Research task failed. Try restarting."}')
			fi
			;;
		*)
			result=$(jq -n --arg status "$status" --arg taskId "$task_id" '{success:false,status:$status,taskId:$taskId,message:"Unknown task status. Continue polling."}')
			;;
		esac
		set_tool_result "$result" 0
		return 0
	fi

	if [[ "$HTTP_STATUS" == "404" ]]; then
		set_tool_result "Task $task_id not found." 1
		return 1
	fi

	set_tool_result "$(extract_api_error "Deep researcher check" "$HTTP_STATUS" "$HTTP_BODY")" 1
	return 1
}

# -----------------------------
# Tool handler helpers (MCP & CLI reuse)
# -----------------------------

json_get_string() {
	local json="$1"
	local field="$2"
	jq -r --arg field "$field" 'if has($field) and .[$field] != null then (.[$field]|tostring) else "" end' <<<"$json"
}

json_get_array() {
	local json="$1"
	local field="$2"
	jq -c --arg field "$field" 'if has($field) and .[$field] != null then .[$field] else [] end' <<<"$json"
}

handle_tool_execute() {
	local tool="$1"
	local args_json="$2"
	case "$tool" in
	web_search_exa)
		perform_web_search \
			"$(json_get_string "$args_json" "query")" \
			"$(json_get_string "$args_json" "numResults")" \
			"$(json_get_string "$args_json" "livecrawl")" \
			"$(json_get_string "$args_json" "type")" \
			"$(json_get_string "$args_json" "contextMaxCharacters")"
		;;
	deep_search_exa)
		perform_deep_search \
			"$(json_get_string "$args_json" "objective")" \
			"$(json_get_array "$args_json" "search_queries")" \
			"$(json_get_string "$args_json" "numResults")" \
			"$(json_get_string "$args_json" "livecrawl")"
		;;
	company_research_exa)
		perform_company_research \
			"$(json_get_string "$args_json" "companyName")" \
			"$(json_get_string "$args_json" "numResults")"
		;;
	crawling_exa)
		perform_crawling \
			"$(json_get_string "$args_json" "url")" \
			"$(json_get_string "$args_json" "maxCharacters")"
		;;
	linkedin_search_exa)
		perform_linkedin_search \
			"$(json_get_string "$args_json" "query")" \
			"$(json_get_string "$args_json" "searchType")" \
			"$(json_get_string "$args_json" "numResults")"
		;;
	get_code_context_exa)
		perform_code_context \
			"$(json_get_string "$args_json" "query")" \
			"$(json_get_string "$args_json" "tokensNum")"
		;;
	deep_researcher_start)
		perform_deep_research_start \
			"$(json_get_string "$args_json" "instructions")" \
			"$(json_get_string "$args_json" "model")"
		;;
	deep_researcher_check)
		perform_deep_research_check \
			"$(json_get_string "$args_json" "taskId")"
		;;
	*)
		set_tool_result "Tool '$tool' is not implemented." 1
		return 1
		;;
	esac
}

# -----------------------------
# MCP plumbing
# -----------------------------

send_response() {
	local payload="$1"
	printf 'Content-Length: %d\r\n\r\n%s' "${#payload}" "$payload"
}

send_result() {
	local id_json="$1"
	local result_json="$2"
	local payload
	payload=$(printf '{"jsonrpc":"2.0","id":%s,"result":%s}' "$id_json" "$result_json")
	send_response "$payload"
}

send_error() {
	local id_json="$1"
	local code="$2"
	local message="$3"
	local payload
	payload=$(jq -n --argjson id "$id_json" --arg message "$message" --argjson code "$code" '{jsonrpc:"2.0",id:$id,error:{code:$code,message:$message}}')
	send_response "$payload"
}

handle_initialize() {
	local id_json="$1"
	local payload
	payload=$(jq -n \
		--arg name "$SERVER_NAME" \
		--arg version "$SERVER_VERSION" \
		--arg protocol "$PROTOCOL_VERSION" \
		--arg instructions "$SERVER_INSTRUCTIONS" \
		'{
      protocolVersion:$protocol,
      capabilities:{tools:{listChanged:false}},
      serverInfo:{name:$name,version:$version},
      instructions:$instructions
    }')
	send_result "$id_json" "$payload"
}

REGISTERED_TOOL_IDS=()
REGISTERED_TOOL_SCHEMAS=()
declare -A TOOL_HANDLERS=()
declare -A TOOL_DEFAULT_ENABLED=(
	[web_search_exa]=1
	[get_code_context_exa]=1
	[deep_search_exa]=0
	[company_research_exa]=0
	[crawling_exa]=0
	[linkedin_search_exa]=0
	[deep_researcher_start]=0
	[deep_researcher_check]=0
)
REQUESTED_TOOLS=()

should_enable_tool() {
	local tool="$1"
	if ((${#REQUESTED_TOOLS[@]})); then
		local item
		for item in "${REQUESTED_TOOLS[@]}"; do
			if [[ "$item" == "$tool" || "$item" == "all" ]]; then
				return 0
			fi
		done
		return 1
	fi
	[[ "${TOOL_DEFAULT_ENABLED[$tool]:-0}" -eq 1 ]]
}

register_tool() {
	local tool="$1"
	local schema="$2"
	local handler="$3"
	REGISTERED_TOOL_IDS+=("$tool")
	REGISTERED_TOOL_SCHEMAS+=("$schema")
	TOOL_HANDLERS["$tool"]="$handler"
}

schema_web_search() {
	cat <<'EOF'
{
  "name": "web_search_exa",
  "description": "Performs real-time web searches with optimized content extraction.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string", "description": "Search query"},
      "numResults": {"type": "integer", "description": "Result count (default 8)"},
      "livecrawl": {"type": "string", "enum": ["fallback","preferred"], "description": "Live crawl mode"},
      "type": {"type": "string", "enum": ["auto","fast","deep"], "description": "Search type"},
      "contextMaxCharacters": {"type": "integer", "description": "Context character budget"}
    },
    "required": ["query"]
  }
}
EOF
}

schema_deep_search() {
	cat <<'EOF'
{
  "name": "deep_search_exa",
  "description": "Deep web search with query expansion and summaries.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "objective": {"type": "string", "description": "Search objective"},
      "search_queries": {"type": "array", "items": {"type": "string"}, "description": "Query variants"},
      "numResults": {"type": "integer", "description": "Result count (default 10)"},
      "livecrawl": {"type": "string", "enum": ["fallback","preferred"], "description": "Live crawl mode"}
    },
    "required": ["objective","search_queries"]
  }
}
EOF
}

schema_company_research() {
	cat <<'EOF'
{
  "name": "company_research_exa",
  "description": "Comprehensive company research across trusted domains.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "companyName": {"type": "string"},
      "numResults": {"type": "integer"}
    },
    "required": ["companyName"]
  }
}
EOF
}

schema_crawling() {
	cat <<'EOF'
{
  "name": "crawling_exa",
  "description": "Fetches content from specific URLs.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {"type": "string"},
      "maxCharacters": {"type": "integer"}
    },
    "required": ["url"]
  }
}
EOF
}

schema_linkedin() {
	cat <<'EOF'
{
  "name": "linkedin_search_exa",
  "description": "Search LinkedIn profiles and companies.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"},
      "searchType": {"type": "string", "enum": ["profiles","companies","all"]},
      "numResults": {"type": "integer"}
    },
    "required": ["query"]
  }
}
EOF
}

schema_code_context() {
	cat <<'EOF'
{
  "name": "get_code_context_exa",
  "description": "Search up-to-date code snippets and docs.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"},
      "tokensNum": {"type": "integer", "minimum": 1000, "maximum": 50000}
    },
    "required": ["query"]
  }
}
EOF
}

schema_deep_research_start() {
	cat <<'EOF'
{
  "name": "deep_researcher_start",
  "description": "Start a deep research task.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "instructions": {"type": "string"},
      "model": {"type": "string", "enum": ["exa-research","exa-research-pro"]}
    },
    "required": ["instructions"]
  }
}
EOF
}

schema_deep_research_check() {
	cat <<'EOF'
{
  "name": "deep_researcher_check",
  "description": "Check status of a deep research task.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskId": {"type": "string"}
    },
    "required": ["taskId"]
  }
}
EOF
}

build_tools_payload() {
	if ((${#REGISTERED_TOOL_SCHEMAS[@]} == 0)); then
		printf '{"tools":[]}'
		return
	fi
	local joined=""
	local schema
	for schema in "${REGISTERED_TOOL_SCHEMAS[@]}"; do
		if [[ -n "$joined" ]]; then
			joined+=$',\n'
		fi
		joined+="$schema"
	done
	printf '{"tools":['
	printf '%s' "$joined"
	printf ']}'
}

handle_list_tools() {
	local id_json="$1"
	local payload
	payload=$(build_tools_payload)
	send_result "$id_json" "$payload"
}

handle_tool_call() {
	local id_json="$1"
	local message="$2"
	local tool
	tool=$(jq -r '.params.name // ""' <<<"$message")
	if [[ -z "$tool" || "$tool" == "null" ]]; then
		send_error "$id_json" -32602 "Tool name is required"
		return
	fi
	local handler="${TOOL_HANDLERS[$tool]:-}"
	if [[ -z "$handler" ]]; then
		send_error "$id_json" -32601 "Tool '$tool' not registered"
		return
	fi
	local args_json
	args_json=$(jq -c '.params.arguments // {}' <<<"$message")
	if ! "$handler" "$tool" "$args_json"; then
		local error_payload
		error_payload=$(build_text_result "$TOOL_RESULT_TEXT" 1)
		send_result "$id_json" "$error_payload"
		return
	fi
	local result_json
	result_json=$(build_text_result "$TOOL_RESULT_TEXT" "$TOOL_RESULT_IS_ERROR")
	send_result "$id_json" "$result_json"
}

handle_logging_set_level() {
	local id_json="$1"
	local message="$2"
	local level
	level=$(jq -r '.params.level // ""' <<<"$message")
	if [[ -n "$level" && "$level" != "null" ]]; then
		LOG_LEVEL="$level"
	fi
	send_result "$id_json" '{}'
}

read_message() {
	local line content_length=""
	while IFS= read -r line; do
		line=${line%$'\r'}
		if [[ -z "$line" ]]; then
			break
		fi
		local lower=${line,,}
		if [[ $lower =~ ^content-length:[[:space:]]*([0-9]+) ]]; then
			content_length="${BASH_REMATCH[1]}"
		fi
	done
	if [[ -z "$content_length" ]]; then
		printf ''
		return 1
	fi
	local message
	if ! IFS= read -r -N "$content_length" message; then
		printf ''
		return 1
	fi
	IFS= read -r _ || true
	printf '%s' "$message"
}

dispatch_message() {
	local raw="$1"
	local parsed
	if ! parsed=$(jq -c '.' <<<"$raw" 2>/dev/null); then
		send_response '{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}'
		return
	fi
	local id_json
	id_json=$(jq -ce 'if has("id") then .id else null end' <<<"$parsed") || id_json=null
	local method
	method=$(jq -r '.method // ""' <<<"$parsed")
	case "$method" in
	initialize)
		handle_initialize "$id_json"
		;;
	"tools/list")
		handle_list_tools "$id_json"
		;;
	"tools/call")
		handle_tool_call "$id_json" "$parsed"
		;;
	"logging/setLevel")
		handle_logging_set_level "$id_json" "$parsed"
		;;
	ping)
		send_result "$id_json" '{}'
		;;
	shutdown)
		send_result "$id_json" '{}'
		exit 0
		;;
	"notifications/initialized") ;;
	*)
		send_error "$id_json" -32601 "Method '$method' not implemented"
		;;
	esac
}

main_loop() {
	while true; do
		local message
		if ! message=$(read_message); then
			break
		fi
		[[ -z "$message" ]] && continue
		dispatch_message "$message"
	done
}

# -----------------------------
# CLI helpers (convert args -> handler calls)
# -----------------------------

cli_invoke_tool() {
	local tool="$1"
	shift
	local args_json="$1"
	shift || true
	if ! handle_tool_execute "$tool" "$args_json"; then
		printf '%s\n' "$TOOL_RESULT_TEXT" >&2
		exit 1
	fi
	if [[ "$TOOL_RESULT_IS_ERROR" -eq 1 ]]; then
		printf '%s\n' "$TOOL_RESULT_TEXT" >&2
		exit 1
	fi
	printf '%s\n' "$TOOL_RESULT_TEXT"
}

run_cli_web_search() {
	local query="" num_results="" livecrawl="" type="" context_max=""
	while (($#)); do
		case "$1" in
		--query)
			query="$2"
			shift 2
			;;
		--num-results)
			num_results="$2"
			shift 2
			;;
		--livecrawl)
			livecrawl="$2"
			shift 2
			;;
		--type)
			type="$2"
			shift 2
			;;
		--context-max)
			context_max="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh web-search --query 'text' [--num-results 5] [--livecrawl preferred] [--type deep] [--context-max 8000]"
			exit 0
			;;
		*)
			echo "Unknown web-search option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$query" ]]; then
		echo "--query is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n \
		--arg query "$query" \
		--arg numResults "$num_results" \
		--arg livecrawl "$livecrawl" \
		--arg type "$type" \
		--arg contextMax "$context_max" \
		'{
      query:$query,
      numResults: (if $numResults=="" then null else $numResults end),
      livecrawl: (if $livecrawl=="" then null else $livecrawl end),
      type: (if $type=="" then null else $type end),
      contextMaxCharacters: (if $contextMax=="" then null else $contextMax end)
    } | with_entries(select(.value != null))')
	cli_invoke_tool "web_search_exa" "$args_json"
}

run_cli_deep_search() {
	local objective="" num_results="" livecrawl="" variants=()
	while (($#)); do
		case "$1" in
		--objective)
			objective="$2"
			shift 2
			;;
		--variant)
			variants+=("$2")
			shift 2
			;;
		--num-results)
			num_results="$2"
			shift 2
			;;
		--livecrawl)
			livecrawl="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh deep-search --objective 'goal' [--variant 'query']..."
			exit 0
			;;
		*)
			echo "Unknown deep-search option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$objective" ]]; then
		echo "--objective is required" >&2
		exit 1
	fi
	local variants_json="[]"
	if ((${#variants[@]})); then
		variants_json=$(printf '%s\n' "${variants[@]}" | jq -R . | jq -s '.')
	fi
	local args_json
	args_json=$(jq -n \
		--arg objective "$objective" \
		--arg livecrawl "$livecrawl" \
		--arg numResults "$num_results" \
		--argjson variants "$variants_json" \
		'{
      objective:$objective,
      search_queries:$variants,
      numResults:(if $numResults=="" then null else $numResults end),
      livecrawl:(if $livecrawl=="" then null else $livecrawl end)
    } | with_entries(select(.value != null))')
	cli_invoke_tool "deep_search_exa" "$args_json"
}

run_cli_company_research() {
	local company="" num_results=""
	while (($#)); do
		case "$1" in
		--company)
			company="$2"
			shift 2
			;;
		--num-results)
			num_results="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh company-research --company 'Name'"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$company" ]]; then
		echo "--company is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n --arg companyName "$company" --arg numResults "$num_results" '{companyName:$companyName,numResults:(if $numResults=="" then null else $numResults end)} | with_entries(select(.value != null))')
	cli_invoke_tool "company_research_exa" "$args_json"
}

run_cli_crawling() {
	local url="" max_chars=""
	while (($#)); do
		case "$1" in
		--url)
			url="$2"
			shift 2
			;;
		--max-chars)
			max_chars="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh crawling --url https://example.com [--max-chars 4000]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$url" ]]; then
		echo "--url is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n --arg url "$url" --arg maxCharacters "$max_chars" '{url:$url,maxCharacters:(if $maxCharacters=="" then null else $maxCharacters end)} | with_entries(select(.value != null))')
	cli_invoke_tool "crawling_exa" "$args_json"
}

run_cli_linkedin() {
	local query="" search_type="" num_results=""
	while (($#)); do
		case "$1" in
		--query)
			query="$2"
			shift 2
			;;
		--type)
			search_type="$2"
			shift 2
			;;
		--num-results)
			num_results="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh linkedin-search --query 'Name' [--type profiles|companies|all]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$query" ]]; then
		echo "--query is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n \
		--arg query "$query" \
		--arg searchType "$search_type" \
		--arg numResults "$num_results" \
		'{
      query:$query,
      searchType:(if $searchType=="" then null else $searchType end),
      numResults:(if $numResults=="" then null else $numResults end)
    } | with_entries(select(.value != null))')
	cli_invoke_tool "linkedin_search_exa" "$args_json"
}

run_cli_code_search() {
	local query="" tokens=""
	while (($#)); do
		case "$1" in
		--query)
			query="$2"
			shift 2
			;;
		--tokens)
			tokens="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh code-search --query 'React hooks' [--tokens 8000]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$query" ]]; then
		echo "--query is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n --arg query "$query" --arg tokens "$tokens" '{query:$query,tokensNum:(if $tokens=="" then null else $tokens end)} | with_entries(select(.value != null))')
	cli_invoke_tool "get_code_context_exa" "$args_json"
}

run_cli_research_start() {
	local instructions="" model=""
	while (($#)); do
		case "$1" in
		--instructions)
			instructions="$2"
			shift 2
			;;
		--model)
			model="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh deep-research-start --instructions '...' [--model exa-research-pro]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$instructions" ]]; then
		echo "--instructions is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n --arg instructions "$instructions" --arg model "$model" '{instructions:$instructions,model:(if $model=="" then null else $model end)} | with_entries(select(.value != null))')
	cli_invoke_tool "deep_researcher_start" "$args_json"
}

run_cli_research_check() {
	local task_id=""
	while (($#)); do
		case "$1" in
		--task-id)
			task_id="$2"
			shift 2
			;;
		-h | --help)
			echo "Usage: exa_mcp.sh deep-research-check --task-id TASK"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
		esac
	done
	if [[ -z "$task_id" ]]; then
		echo "--task-id is required" >&2
		exit 1
	fi
	local args_json
	args_json=$(jq -n --arg taskId "$task_id" '{taskId:$taskId}')
	cli_invoke_tool "deep_researcher_check" "$args_json"
}

# -----------------------------
# Argument parsing
# -----------------------------

while (($#)); do
	case "$1" in
	--api-key)
		API_KEY="$2"
		shift 2
		;;
	--tools)
		ENABLED_TOOLS_INPUT="$2"
		shift 2
		;;
	tools=*)
		ENABLED_TOOLS_INPUT="${1#tools=}"
		shift
		;;
	exaApiKey=*)
		API_KEY="${1#exaApiKey=}"
		shift
		;;
	--log-level)
		LOG_LEVEL="$2"
		shift 2
		;;
	--timeout)
		REQUEST_TIMEOUT="$2"
		shift 2
		;;
	-h | --help)
		print_help
		exit 0
		;;
	--)
		shift
		break
		;;
	web-search | web_search | web_search_exa)
		MODE="web-search"
		shift
		break
		;;
	deep-search | deep_search | deep_search_exa)
		MODE="deep-search"
		shift
		break
		;;
	company-research | company_research | company_research_exa)
		MODE="company-research"
		shift
		break
		;;
	crawling | crawling_exa)
		MODE="crawling"
		shift
		break
		;;
	linkedin-search | linkedin_search | linkedin_search_exa)
		MODE="linkedin-search"
		shift
		break
		;;
	code-search | get_code_context | get_code_context_exa)
		MODE="code-search"
		shift
		break
		;;
	deep-research-start | deep_researcher_start)
		MODE="deep-research-start"
		shift
		break
		;;
	deep-research-check | deep_researcher_check)
		MODE="deep-research-check"
		shift
		break
		;;
	mcp | serve)
		echo "MCP server mode is no longer supported by this script." >&2
		exit 1
		;;
	*)
		MODE="$1"
		shift
		break
		;;
	esac
done

while (($#)); do
	POSITIONAL+=("$1")
	shift
done

set -- "${POSITIONAL[@]}"

if [[ -z "$MODE" ]]; then
	print_help
	exit 0
fi

if [[ -z "$API_KEY" ]]; then
	API_KEY=""
fi

require_command jq
require_command curl

if ! [[ "$REQUEST_TIMEOUT" =~ ^[0-9]+$ ]]; then
	REQUEST_TIMEOUT="$DEFAULT_TIMEOUT"
fi

if [[ -n "$ENABLED_TOOLS_INPUT" ]]; then
	normalize_tools_input "$ENABLED_TOOLS_INPUT"
fi

if should_enable_tool "web_search_exa"; then
	register_tool "web_search_exa" "$(schema_web_search)" handle_tool_execute
fi
if should_enable_tool "deep_search_exa"; then
	register_tool "deep_search_exa" "$(schema_deep_search)" handle_tool_execute
fi
if should_enable_tool "company_research_exa"; then
	register_tool "company_research_exa" "$(schema_company_research)" handle_tool_execute
fi
if should_enable_tool "crawling_exa"; then
	register_tool "crawling_exa" "$(schema_crawling)" handle_tool_execute
fi
if should_enable_tool "linkedin_search_exa"; then
	register_tool "linkedin_search_exa" "$(schema_linkedin)" handle_tool_execute
fi
if should_enable_tool "deep_researcher_start"; then
	register_tool "deep_researcher_start" "$(schema_deep_research_start)" handle_tool_execute
fi
if should_enable_tool "deep_researcher_check"; then
	register_tool "deep_researcher_check" "$(schema_deep_research_check)" handle_tool_execute
fi
if should_enable_tool "get_code_context_exa"; then
	register_tool "get_code_context_exa" "$(schema_code_context)" handle_tool_execute
fi

case "$MODE" in
web-search)
	run_cli_web_search "$@"
	exit 0
	;;
deep-search)
	run_cli_deep_search "$@"
	exit 0
	;;
company-research)
	run_cli_company_research "$@"
	exit 0
	;;
crawling)
	run_cli_crawling "$@"
	exit 0
	;;
linkedin-search)
	run_cli_linkedin "$@"
	exit 0
	;;
code-search)
	run_cli_code_search "$@"
	exit 0
	;;
deep-research-start)
	run_cli_research_start "$@"
	exit 0
	;;
deep-research-check)
	run_cli_research_check "$@"
	exit 0
	;;
mcp|serve)
	echo "MCP server mode is no longer supported by this script." >&2
	exit 1
	;;
*)
	echo "Unknown command: $MODE" >&2
	print_help >&2
	exit 1
	;;
esac
