#!/usr/bin/env bash
# Context7 MCP reference implementation in Bash.
# Provides resolve-library-id and get-library-docs tools over the MCP stdio transport.

set -euo pipefail

if [[ -f .env ]]; then
    source .env
fi

LC_ALL=C

SERVER_NAME="context7-bash"
SERVER_VERSION="0.1.0"
PROTOCOL_VERSION="2024-11-05"
API_BASE="https://context7.com/api"
DEFAULT_RESULTS_LIMIT="${CONTEXT7_RESULTS_LIMIT:-10}"
DEFAULT_ENCRYPTION_KEY=""
USER_AGENT="${SERVER_NAME}/${SERVER_VERSION}"

API_KEY="${CONTEXT7_API_KEY:-}"
API_KEY_FILE="${CONTEXT7_API_KEY_FILE:-}"
CLIENT_IP="${MCP_CLIENT_IP:-}"
LOG_LEVEL="${CONTEXT7_LOG_LEVEL:-info}"
DOC_FORMAT="${CONTEXT7_DOC_FORMAT:-txt}"
DOC_TOKENS="${CONTEXT7_DOC_TOKENS:-}"

MODE=""

# Capture any positional arguments after option parsing for subcommands (resolve/docs).
declare -a POSITIONAL=()

if ! [[ "$DEFAULT_RESULTS_LIMIT" =~ ^[0-9]+$ ]]; then
  DEFAULT_RESULTS_LIMIT=10
fi

SERVER_INSTRUCTIONS=$'Use this server to retrieve up-to-date documentation and code examples for any library.'

RESOLVE_DESCRIPTION=$'Resolves a package/product name to a Context7-compatible library ID and returns a list of matching libraries.\n\nYou MUST call this function before get-library-docs to obtain a valid Context7-compatible library ID unless the user explicitly provides an ID in the format /org/project or /org/project/version.\n\nSelection Process:\n1. Analyze the query to understand what library/package the user is looking for\n2. Return the most relevant match based on:\n   - Name similarity to the query (exact matches prioritized)\n   - Description relevance to the query\n   - Documentation coverage (prioritize libraries with higher code snippet counts)\n   - Source reputation (High/Medium/Low)\n   - Benchmark Score (100 is the highest score)\n\nResponse Format:\n- Highlight the selected library ID\n- Explain why it fits\n- If multiple good matches exist, acknowledge them but pick the best\n- If no good matches exist, clearly state this and suggest refinements'

DOCS_DESCRIPTION=$'Fetches up-to-date documentation for a library using a Context7-compatible library ID. Call resolve-library-id first to obtain the exact Context7-compatible library ID, unless the user already provided an ID in the format /org/project or /org/project/version. Supports optional topic filtering and pagination via the page parameter (1-10).'

print_help() {
  cat <<'EOF'
Context7 CLI (API-backed)
Usage:
  context7_mcp.sh --help
  context7_mcp.sh resolve <library name>          # Resolve a Context7 library ID directly
  context7_mcp.sh docs --id <id> [--topic x] [--page n]

Global options (apply to every mode):
  --api-key ctx7sk...        Provide Context7 API key (or set CONTEXT7_API_KEY)
  --api-key-file path        Read API key from a file (first line used)
  --client-ip 203.0.113.42   Forward a specific client IP (will be encrypted when possible)
  --log-level info|debug     Adjust logging detail (default: info)
  --doc-format txt|json      Preferred documentation format (default: txt)
  --doc-tokens 100-100000    Set token budget per docs response (optional)
  -h, --help                 Show this help text and exit

Docs command options:
  --id /org/project[/version] (required)
  --topic hooks|routing|...  Focus docs on a topic
  --page 1-10                Fetch a specific documentation page (default 1)
  --format txt|json          Override response format for this call
  --tokens 100-100000        Override token budget for this call

Environment variables:
  CONTEXT7_API_KEY             Default API key for Context7 requests
  CONTEXT7_API_KEY_FILE        File containing API key (takes precedence when set)
  MCP_CLIENT_IP                Optional client IP forwarded to Context7 (will be encrypted when possible)
  CLIENT_IP_ENCRYPTION_KEY     Hex-encoded 32-byte key for AES-256 client IP encryption
  CONTEXT7_RESULTS_LIMIT       Number of documentation chunks per page (default 10)
  CONTEXT7_LOG_LEVEL           Log verbosity (info or debug)
  CONTEXT7_DOC_FORMAT          Default docs response format (txt/json)
  CONTEXT7_DOC_TOKENS          Default docs token budget (100-100000)
EOF
}

normalize_doc_format_value() {
  local value="${1,,}"
  if [[ "$value" != "json" ]]; then
    value="txt"
  fi
  printf '%s' "$value"
}

normalize_doc_tokens_value() {
  local value="$1"
  if [[ -z "$value" ]]; then
    printf ''
    return
  fi
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "Warning: Ignoring invalid tokens value '$value'. Expected integer between 100 and 100000." >&2
    printf ''
    return
  fi
  if (( value < 100 || value > 100000 )); then
    echo "Warning: Ignoring tokens value '$value'. Allowed range is 100-100000 as per Context7 API guide." >&2
    printf ''
    return
  fi
  printf '%s' "$value"
}

load_api_key_from_file() {
  local path="$1"
  if [[ -z "$path" ]]; then
    return
  fi
  if [[ ! -f "$path" ]]; then
    echo "Warning: API key file '$path' not found" >&2
    return
  fi
  local key
  key=$(head -n 1 "$path" | tr -d '\r\n')
  if [[ -z "$key" ]]; then
    echo "Warning: API key file '$path' is empty" >&2
    return
  fi
  API_KEY="$key"
}

extract_retry_after() {
  local body="$1"
  if [[ -z "$body" ]]; then
    printf ''
    return
  fi
  local retry
  if ! retry=$(jq -r 'try .retryAfterSeconds catch empty' <<<"$body" 2>/dev/null); then
    printf ''
    return
  fi
  if [[ "$retry" == "null" || -z "$retry" ]]; then
    printf ''
    return
  fi
  printf '%s' "$retry"
}

while (($#)); do
  case "$1" in
    --api-key)
      [[ $# -ge 2 ]] || { echo "Missing value for --api-key" >&2; exit 1; }
      API_KEY="$2"
      shift 2
      ;;
    --client-ip)
      [[ $# -ge 2 ]] || { echo "Missing value for --client-ip" >&2; exit 1; }
      CLIENT_IP="$2"
      shift 2
      ;;
    --log-level)
      [[ $# -ge 2 ]] || { echo "Missing value for --log-level" >&2; exit 1; }
      LOG_LEVEL="$2"
      shift 2
      ;;
    --api-key-file)
      [[ $# -ge 2 ]] || { echo "Missing value for --api-key-file" >&2; exit 1; }
      API_KEY_FILE="$2"
      shift 2
      ;;
    --doc-format)
      [[ $# -ge 2 ]] || { echo "Missing value for --doc-format" >&2; exit 1; }
      DOC_FORMAT="$2"
      shift 2
      ;;
    --doc-tokens)
      [[ $# -ge 2 ]] || { echo "Missing value for --doc-tokens" >&2; exit 1; }
      DOC_TOKENS="$2"
      shift 2
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    --)
      shift
      break
      ;;
    resolve|resolve-library-id|get-library-docs|get-docs|docs)
      MODE="$1"
      shift
      break
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

DOC_FORMAT=$(normalize_doc_format_value "$DOC_FORMAT")
DOC_TOKENS=$(normalize_doc_tokens_value "$DOC_TOKENS")

if [[ -n "$API_KEY_FILE" ]]; then
  load_api_key_from_file "$API_KEY_FILE"
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' not found in PATH" >&2
    exit 1
  fi
}

require_command jq
require_command curl
require_command sed

# Optional dependencies for client IP encryption.
if [[ -n "${CLIENT_IP:-}" ]]; then
  if ! command -v openssl >/dev/null 2>&1 || ! command -v xxd >/dev/null 2>&1; then
    echo "Warning: openssl/xxd not found; client IP will not be encrypted" >&2
  fi
fi

log_debug() {
  if [[ "$LOG_LEVEL" == "debug" ]]; then
    echo "[debug] $*" >&2
  fi
}

urlencode() {
  jq -rn --arg v "$1" '$v|@uri'
}

trim_whitespace() {
  printf '%s' "$1" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

encrypt_client_ip() {
  local ip="$1"
  local key="${CLIENT_IP_ENCRYPTION_KEY:-$DEFAULT_ENCRYPTION_KEY}"

  if [[ -z "$ip" ]]; then
    return
  fi
  if [[ ! "$key" =~ ^[0-9a-fA-F]{64}$ ]]; then
    printf '%s' "$ip"
    return
  fi
  if ! command -v openssl >/dev/null 2>&1 || ! command -v xxd >/dev/null 2>&1; then
    printf '%s' "$ip"
    return
  fi

  local iv encrypted
  if ! iv=$(openssl rand -hex 16 2>/dev/null); then
    printf '%s' "$ip"
    return
  fi
  if ! encrypted=$(printf '%s' "$ip" | openssl enc -aes-256-cbc -K "$key" -iv "$iv" -nosalt 2>/dev/null | xxd -p -c 200 2>/dev/null | tr -d '\n'); then
    printf '%s' "$ip"
    return
  fi
  printf '%s:%s' "$iv" "$encrypted"
}

ENCRYPTED_CLIENT_IP=""
if [[ -n "${CLIENT_IP:-}" ]]; then
  ENCRYPTED_CLIENT_IP="$(encrypt_client_ip "$CLIENT_IP")"
fi

http_request() {
  local accept="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="${4:-}"
  local api_key_override="${5:-}"

  local tmp
  tmp=$(mktemp)
  local -a curl_args
  curl_args=(-sS -o "$tmp" -w '%{http_code}' -X "$method" -H "Accept: $accept" -H "User-Agent: $USER_AGENT" -H "X-Context7-Source: bash-mcp")

  local key_to_use="${api_key_override:-$API_KEY}"
  if [[ -n "$key_to_use" ]]; then
    curl_args+=(-H "Authorization: Bearer $key_to_use")
  fi
  if [[ -n "${ENCRYPTED_CLIENT_IP:-}" ]]; then
    curl_args+=(-H "mcp-client-ip: $ENCRYPTED_CLIENT_IP")
  fi

  if [[ "$method" == "GET" ]]; then
    curl_args+=("$url")
  else
    curl_args+=(-H "Content-Type: application/json" --data "$data" "$url")
  fi

  local status
  if ! status=$(curl "${curl_args[@]}" 2> >(cat >&2)); then
    HTTP_STATUS=0
    HTTP_RESPONSE_BODY=""
    rm -f "$tmp"
    return 1
  fi

  HTTP_STATUS="$status"
  HTTP_RESPONSE_BODY="$(cat "$tmp")"
  rm -f "$tmp"
  return 0
}

search_error_message() {
  local status="$1"
  local body="$2"
  local retry_after
  retry_after=$(extract_retry_after "$body")
  local retry_hint=""
  if [[ -n "$retry_after" ]]; then
    retry_hint=" Please retry after ${retry_after}s (Context7 API guidance)."
  fi
  if [[ "$status" == "429" ]]; then
    if [[ -n "$API_KEY" ]]; then
      printf '%s' "Rate limited due to too many requests.${retry_hint}"
    else
      printf '%s' "Rate limited due to too many requests. Create a free Context7 API key at https://context7.com/dashboard for higher limits.${retry_hint}"
    fi
  elif [[ "$status" == "401" ]]; then
    printf '%s' "Unauthorized. Please check your API key. API keys start with 'ctx7sk'."
  else
    printf 'Failed to search libraries. Please try again later. Error code: %s' "$status"
  fi
}

docs_error_message() {
  local status="$1"
  local body="$2"
  local retry_after
  retry_after=$(extract_retry_after "$body")
  local retry_hint=""
  if [[ -n "$retry_after" ]]; then
    retry_hint=" Please retry after ${retry_after}s (Context7 API guidance)."
  fi
  if [[ "$status" == "429" ]]; then
    if [[ -n "$API_KEY" ]]; then
      printf '%s' "Rate limited due to too many requests.${retry_hint}"
    else
      printf '%s' "Rate limited due to too many requests. Create a free Context7 API key at https://context7.com/dashboard for higher limits.${retry_hint}"
    fi
  elif [[ "$status" == "404" ]]; then
    printf '%s' "The library you requested does not exist. Use resolve-library-id first to obtain a valid Context7-compatible ID."
  elif [[ "$status" == "401" ]]; then
    printf '%s' "Unauthorized. Please check your API key. API keys start with 'ctx7sk'."
  else
    printf 'Failed to fetch documentation. Please try again later. Error code: %s' "$status"
  fi
}

format_search_results() {
  local json="$1"
  jq -r '
    .results
    | map(
        [
          "- Title: " + (.title // "Unknown"),
          "- Context7-compatible library ID: " + (.id // "Unknown"),
          "- Description: " + (.description // ""),
          (if (.totalSnippets != null and .totalSnippets != -1) then "- Code Snippets: " + (.totalSnippets|tostring) else empty end),
          "- Source Reputation: " + (
            if (.trustScore == null or .trustScore < 0) then "Unknown"
            elif .trustScore >= 7 then "High"
            elif .trustScore >= 4 then "Medium"
            else "Low"
            end
          ),
          (if (.benchmarkScore != null and .benchmarkScore > 0) then "- Benchmark Score: " + (.benchmarkScore|tostring) else empty end),
          (if (.versions != null and (.versions|length>0)) then "- Versions: " + (.versions|join(", ")) else empty end)
        ]
        | map(select(. != null and . != ""))
        | join("\n")
      )
    | join("\n----------\n")
  ' <<<"$json"
}

build_text_result() {
  local text="$1"
  jq -Rn --arg txt "$text" '{content:[{type:"text",text:$txt}]}'
}

print_resolve_usage() {
  cat <<'EOF'
Usage: context7_mcp.sh resolve <library name>
Example: context7_mcp.sh resolve "react router"
EOF
}

print_docs_usage() {
  cat <<'EOF'
Usage: context7_mcp.sh docs --id /org/project[/version] [--topic hooks] [--page 2] [--format json] [--tokens 2000]
Example: context7_mcp.sh docs --id /vercel/next.js --topic routing --page 2 --format json --tokens 5000
EOF
}

send_response() {
  local payload="$1"
  local len=${#payload}
  printf 'Content-Length: %d\r\n\r\n%s' "$len" "$payload"
}

send_result() {
  local id_json="$1"
  local result_json="$2"
  [[ -z "$id_json" ]] && return
  local payload
  payload=$(printf '{"jsonrpc":"2.0","id":%s,"result":%s}' "$id_json" "$result_json")
  send_response "$payload"
}

send_error() {
  local id_json="$1"
  local code="$2"
  local message="$3"
  [[ -z "$id_json" ]] && return
  local message_json
  message_json=$(jq -Rn --arg msg "$message" '$msg')
  local payload
  payload=$(printf '{"jsonrpc":"2.0","id":%s,"error":{"code":%s,"message":%s}}' "$id_json" "$code" "$message_json")
  send_response "$payload"
}

handle_initialize() {
  local id_json="$1"
  local result
  result=$(jq -n \
    --arg name "$SERVER_NAME" \
    --arg ver "$SERVER_VERSION" \
    --arg instr "$SERVER_INSTRUCTIONS" \
    --arg protocol "$PROTOCOL_VERSION" \
    '{
      protocolVersion:$protocol,
      capabilities:{tools:{listChanged:false}},
      serverInfo:{name:$name,version:$ver},
      instructions:$instr
    }')
  send_result "$id_json" "$result"
}

build_tools_payload() {
  jq -n \
    --arg resolveDesc "$RESOLVE_DESCRIPTION" \
    --arg docsDesc "$DOCS_DESCRIPTION" \
    '{
      tools:[
        {
          name:"resolve-library-id",
          description:$resolveDesc,
          inputSchema:{
            type:"object",
            properties:{
              libraryName:{
                type:"string",
                description:"Library name to search for and retrieve a Context7-compatible library ID."
              }
            },
            required:["libraryName"]
          }
        },
        {
          name:"get-library-docs",
          description:$docsDesc,
          inputSchema:{
            type:"object",
            properties:{
              context7CompatibleLibraryID:{
                type:"string",
                description:"Exact Context7-compatible library ID (e.g., /mongodb/docs, /vercel/next.js, /vercel/next.js/v14.3.0)."
              },
              topic:{
                type:"string",
                description:"Topic to focus documentation on (e.g., hooks, routing)."
              },
              page:{
                type:"integer",
                minimum:1,
                maximum:10,
                description:"Page number for pagination (default 1, range 1-10)."
              }
            },
            required:["context7CompatibleLibraryID"]
          }
        }
      ]
    }'
}

handle_list_tools() {
  local id_json="$1"
  local payload
  payload=$(build_tools_payload)
  send_result "$id_json" "$payload"
}

call_search_endpoint() {
  local query="$1"
  local encoded
  encoded=$(urlencode "$query")
  local url="${API_BASE}/v1/search?query=${encoded}"
  if ! http_request "application/json" "$url"; then
    SEARCH_STATUS=0
    SEARCH_JSON=""
    return 1
  fi
  SEARCH_STATUS="$HTTP_STATUS"
  SEARCH_JSON="$HTTP_RESPONSE_BODY"
  return 0
}

call_docs_endpoint() {
  local library_id="$1"
  local page="$2"
  local topic="$3"
  local format="${4:-$DOC_FORMAT}"
  local tokens="${5:-$DOC_TOKENS}"

  library_id=$(trim_whitespace "$library_id")
  library_id="${library_id#/}"
  library_id="${library_id%/}"
  format=$(normalize_doc_format_value "$format")

  local url="${API_BASE}/v2/docs/code/${library_id}?type=${format}&limit=${DEFAULT_RESULTS_LIMIT}&page=${page}"
  if [[ -n "$topic" ]]; then
    local topic_encoded
    topic_encoded=$(urlencode "$topic")
    url+="&topic=${topic_encoded}"
  fi
  if [[ -n "$tokens" ]]; then
    url+="&tokens=${tokens}"
  fi

  local accept_header="text/plain"
  if [[ "$format" == "json" ]]; then
    accept_header="application/json"
  fi

  if ! http_request "$accept_header" "$url"; then
    DOCS_STATUS=0
    DOCS_BODY=""
    return 1
  fi
  DOCS_STATUS="$HTTP_STATUS"
  DOCS_BODY="$HTTP_RESPONSE_BODY"
  return 0
}

run_cli_resolve() {
  local query="$*"
  query=$(trim_whitespace "$query")
  if [[ -z "$query" ]]; then
    print_resolve_usage >&2
    exit 1
  fi

  if ! call_search_endpoint "$query"; then
    echo "Failed to reach the Context7 search API. Please check your network connection and try again." >&2
    exit 1
  fi

  if [[ "$SEARCH_STATUS" -ge 200 && "$SEARCH_STATUS" -lt 300 ]]; then
    local count
    count=$(jq '.results | length' <<<"$SEARCH_JSON")
    if [[ "$count" -eq 0 ]]; then
      local fallback
      fallback=$(jq -r '.error // "No documentation libraries found matching your query."' <<<"$SEARCH_JSON")
      printf '%s\n' "$fallback"
      exit 0
    fi
    local formatted
    formatted=$(format_search_results "$SEARCH_JSON")
    local header
    header=$'Available Libraries (top matches):\n\nEach result includes:\n- Library ID\n- Description\n- Code Snippets (when available)\n- Source Reputation\n- Benchmark Score\n- Versions (if any)\n\n----------\n'
    printf '%s%s\n' "$header" "$formatted"
    exit 0
  fi

  local error_msg
  error_msg=$(search_error_message "$SEARCH_STATUS" "$SEARCH_JSON")
  printf '%s\n' "$error_msg" >&2
  exit 1
}

run_cli_docs() {
  local library_id=""
  local topic=""
  local page=1
  local cli_format=""
  local cli_tokens=""

  while (($#)); do
    case "$1" in
      --id)
        [[ $# -ge 2 ]] || { echo "Missing value for --id" >&2; print_docs_usage >&2; exit 1; }
        library_id="$2"
        shift 2
        ;;
      --topic)
        [[ $# -ge 2 ]] || { echo "Missing value for --topic" >&2; print_docs_usage >&2; exit 1; }
        topic="$2"
        shift 2
        ;;
      --page)
        [[ $# -ge 2 ]] || { echo "Missing value for --page" >&2; print_docs_usage >&2; exit 1; }
        page="$2"
        shift 2
        ;;
      --format)
        [[ $# -ge 2 ]] || { echo "Missing value for --format" >&2; print_docs_usage >&2; exit 1; }
        cli_format="$2"
        shift 2
        ;;
      --tokens)
        [[ $# -ge 2 ]] || { echo "Missing value for --tokens" >&2; print_docs_usage >&2; exit 1; }
        cli_tokens="$2"
        shift 2
        ;;
      -h|--help)
        print_docs_usage
        exit 0
        ;;
      *)
        if [[ -z "$library_id" ]]; then
          library_id="$1"
          shift
        else
          echo "Unexpected argument: $1" >&2
          print_docs_usage >&2
          exit 1
        fi
        ;;
    esac
  done

  library_id=$(trim_whitespace "$library_id")
  topic=$(trim_whitespace "$topic")

  if [[ -z "$library_id" ]]; then
    echo "--id is required." >&2
    print_docs_usage >&2
    exit 1
  fi

  if ! [[ "$page" =~ ^[0-9]+$ ]] || (( page < 1 || page > 10 )); then
    echo "--page must be an integer between 1 and 10." >&2
    exit 1
  fi

  local format_override="$DOC_FORMAT"
  if [[ -n "$cli_format" ]]; then
    format_override=$(normalize_doc_format_value "$cli_format")
  fi

  local tokens_override="$DOC_TOKENS"
  if [[ -n "$cli_tokens" ]]; then
    tokens_override=$(normalize_doc_tokens_value "$cli_tokens")
  fi

  if ! call_docs_endpoint "$library_id" "$page" "$topic" "$format_override" "$tokens_override"; then
    echo "Failed to reach the Context7 documentation API. Please check your network connection and try again." >&2
    exit 1
  fi

  if [[ "$DOCS_STATUS" -ge 200 && "$DOCS_STATUS" -lt 300 ]]; then
    local body_trimmed
    body_trimmed=$(printf '%s' "$DOCS_BODY" | tr -d '\r')
    if [[ "$format_override" == "json" ]]; then
      if [[ -z "$body_trimmed" ]]; then
        echo "Empty JSON payload returned." >&2
        exit 1
      fi
      if jq -e . >/dev/null 2>&1 <<<"$body_trimmed"; then
        jq '.' <<<"$body_trimmed"
      else
        printf '%s\n' "$body_trimmed"
      fi
    else
      local body_compact
      body_compact=$(printf '%s' "$body_trimmed" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
      if [[ -z "$body_compact" || "$body_compact" == "No content available" || "$body_compact" == "No context data available" ]]; then
        echo "Documentation not found or not finalized for this library. Use resolve-library-id to confirm the ID and try again later." >&2
        exit 1
      fi
      printf '%s\n' "$body_trimmed"
    fi
    exit 0
  fi

  local error_msg
  error_msg=$(docs_error_message "$DOCS_STATUS" "$DOCS_BODY")
  printf '%s\n' "$error_msg" >&2
  exit 1
}

handle_resolve_tool() {
  local id_json="$1"
  local args_json="$2"
  local library_name
  library_name=$(jq -r '.libraryName // ""' <<<"$args_json")
  if [[ "$library_name" == "null" ]]; then
    library_name=""
  fi
  library_name=$(trim_whitespace "$library_name")

  if [[ -z "$library_name" ]]; then
    send_error "$id_json" -32602 "The libraryName field is required."
    return
  fi

  if ! call_search_endpoint "$library_name"; then
    local res
    res=$(build_text_result "Failed to reach the Context7 search API. Please check your network connection and try again.")
    send_result "$id_json" "$res"
    return
  fi

  if [[ "$SEARCH_STATUS" -ge 200 && "$SEARCH_STATUS" -lt 300 ]]; then
    local result_count
    result_count=$(jq '.results | length' <<<"$SEARCH_JSON")
    if [[ "$result_count" -eq 0 ]]; then
      local fallback
      fallback=$(jq -r '.error // "No documentation libraries found matching your query."' <<<"$SEARCH_JSON")
      local res
      res=$(build_text_result "$fallback")
      send_result "$id_json" "$res"
      return
    fi

    local formatted
    formatted=$(format_search_results "$SEARCH_JSON")
    local header
    header=$'Available Libraries (top matches):\n\nEach result includes:\n- Library ID: Context7-compatible identifier (format: /org/project)\n- Name: Library or package name\n- Description: Short summary\n- Code Snippets: Number of available code examples\n- Source Reputation: Authority indicator (High, Medium, Low, or Unknown)\n- Benchmark Score: Quality indicator (100 is the highest score)\n- Versions: List of versions if available (format: /org/project/version).\n\nFor best results, select libraries based on name match, source reputation, snippet coverage, benchmark score, and relevance to your use case.\n\n----------\n'
    local response_text="${header}${formatted}"
    local res
    res=$(build_text_result "$response_text")
    send_result "$id_json" "$res"
    return
  fi

  local error_msg
  error_msg=$(search_error_message "$SEARCH_STATUS" "$SEARCH_JSON")
  local res
  res=$(build_text_result "$error_msg")
  send_result "$id_json" "$res"
}

handle_docs_tool() {
  local id_json="$1"
  local args_json="$2"
  local library_id
  library_id=$(jq -r '.context7CompatibleLibraryID // ""' <<<"$args_json")
  if [[ "$library_id" == "null" ]]; then
    library_id=""
  fi
  library_id=$(trim_whitespace "$library_id")

  if [[ -z "$library_id" ]]; then
    send_error "$id_json" -32602 "context7CompatibleLibraryID is required."
    return
  fi

  local page
  page=$(jq -r '.page // 1' <<<"$args_json")
  if [[ "$page" == "null" ]]; then
    page=1
  fi
  if ! [[ "$page" =~ ^[0-9]+$ ]]; then
    send_error "$id_json" -32602 "page must be an integer between 1 and 10."
    return
  fi
  if (( page < 1 || page > 10 )); then
    send_error "$id_json" -32602 "page must be between 1 and 10."
    return
  fi

  local topic
  topic=$(jq -r '.topic // ""' <<<"$args_json")
  if [[ "$topic" == "null" ]]; then
    topic=""
  fi
  topic=$(trim_whitespace "$topic")

  if ! call_docs_endpoint "$library_id" "$page" "$topic"; then
    local res
    res=$(build_text_result "Failed to reach the Context7 documentation API. Please check your network connection and try again.")
    send_result "$id_json" "$res"
    return
  fi

  if [[ "$DOCS_STATUS" -ge 200 && "$DOCS_STATUS" -lt 300 ]]; then
    local body_trimmed
    body_trimmed=$(printf '%s' "$DOCS_BODY" | tr -d '\r')
    local body_compact
    body_compact=$(printf '%s' "$body_trimmed" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
    if [[ -z "$body_compact" || "$body_compact" == "No content available" || "$body_compact" == "No context data available" ]]; then
      local res
      res=$(build_text_result "Documentation not found or not finalized for this library. Use resolve-library-id to confirm the ID and try again later.")
      send_result "$id_json" "$res"
      return
    fi
    local res
    res=$(build_text_result "$body_trimmed")
    send_result "$id_json" "$res"
    return
  fi

  local error_msg
  error_msg=$(docs_error_message "$DOCS_STATUS" "$DOCS_BODY")
  local res
  res=$(build_text_result "$error_msg")
  send_result "$id_json" "$res"
}

handle_tool_call() {
  local id_json="$1"
  local message="$2"
  local tool_name
  tool_name=$(jq -r '.params.name // ""' <<<"$message")
  if [[ "$tool_name" == "null" || -z "$tool_name" ]]; then
    send_error "$id_json" -32602 "Tool name is required."
    return
  fi
  local args_json
  args_json=$(jq -c '.params.arguments // {}' <<<"$message")

  case "$tool_name" in
    resolve-library-id)
      handle_resolve_tool "$id_json" "$args_json"
      ;;
    get-library-docs)
      handle_docs_tool "$id_json" "$args_json"
      ;;
    *)
      send_error "$id_json" -32601 "Tool '$tool_name' is not implemented."
      ;;
  esac
}

handle_logging_set_level() {
  local id_json="$1"
  local message="$2"
  local level
  level=$(jq -r '.params.level // ""' <<<"$message")
  if [[ "$level" != "null" && -n "$level" ]]; then
    LOG_LEVEL="$level"
  fi
  send_result "$id_json" '{}'
}

read_message() {
  local line
  local content_length=""
  while true; do
    if ! IFS= read -r line; then
      echo ""
      return 1
    fi
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
    echo ""
    return 1
  fi

  local message
  if ! IFS= read -r -N "$content_length" message; then
    echo ""
    return 1
  fi
  # Consume the trailing newline (CRLF) if present.
  IFS= read -r _ || true
  printf '%s' "$message"
}

dispatch_message() {
  local raw="$1"
  local parsed
  if ! parsed=$(jq -c '.' <<<"$raw" 2>/dev/null); then
    local payload
    payload=$(jq -n '{jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}}')
    send_response "$payload"
    return
  fi

  local id_json
  if ! id_json=$(jq -ce 'if has("id") then .id else empty end' <<<"$parsed" 2>/dev/null); then
    id_json=""
  fi

  local method
  method=$(jq -r '.method // ""' <<<"$parsed")

  if [[ -z "$method" || "$method" == "null" ]]; then
    if [[ -n "$id_json" ]]; then
      send_error "$id_json" -32600 "Invalid request: method is required."
    fi
    return
  fi

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
    "notifications/initialized")
      ;;
    *)
      if [[ -n "$id_json" ]]; then
        send_error "$id_json" -32601 "Method '$method' is not implemented."
      fi
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
    log_debug "Received: $message"
    dispatch_message "$message"
  done
}

case "$MODE" in
  resolve|"resolve-library-id")
    run_cli_resolve "$@"
    ;;
  docs|get-library-docs|get-docs)
    run_cli_docs "$@"
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