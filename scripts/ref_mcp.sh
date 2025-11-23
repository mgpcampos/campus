#!/usr/bin/env bash
# Ref MCP Bash client: talks directly to https://api.ref.tools/mcp using curl.
# Exposes CLI-friendly wrappers for ref_search_documentation and ref_read_url.

set -euo pipefail

if [[ -f .env ]]; then
    source .env
fi

MCP_URL="${MCP_URL:-https://api.ref.tools/mcp}"
USER_AGENT="${REF_MCP_USER_AGENT:-curl-mcp-client/0.1}"
PROTOCOL_VERSION="2024-11-05"
CLIENT_NAME="ref-mcp-bash"
CLIENT_VERSION="0.1.0"

SESSION_ID=""
REQUEST_ID=0
HAS_JQ=0
TMP_DIR=""
AUTH_HEADER_NAME=""
AUTH_HEADER_VALUE=""

if command -v jq >/dev/null 2>&1; then
	HAS_JQ=1
fi

cleanup() {
	local status=$?
	if [[ -n "$SESSION_ID" ]]; then
		curl -sS -X DELETE "$MCP_URL" \
			-H "${AUTH_HEADER_NAME}: ${AUTH_HEADER_VALUE}" \
			-H 'Accept: application/json, text/event-stream' \
			-H "User-Agent: ${USER_AGENT}" \
			-H "mcp-session-id: ${SESSION_ID}" >/dev/null 2>&1 || true
	fi
	if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
		rm -rf "$TMP_DIR"
	fi
	exit $status
}

trap cleanup EXIT

mkdir -p /tmp
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t refmcp)

error() {
	echo "[ref-mcp] $*" >&2
	exit 1
}



next_id() {
	REQUEST_ID=$((REQUEST_ID + 1))
	printf '%d' "$REQUEST_ID"
}

require_auth() {
	if [[ -n "${AUTH_HEADER_NAME}" ]]; then
		return
	fi
	if [[ -n "${REF_API_KEY:-}" ]]; then
		AUTH_HEADER_NAME="X-Ref-Api-Key"
		AUTH_HEADER_VALUE="$REF_API_KEY"
	elif [[ -n "${REF_ALPHA:-}" ]]; then
		AUTH_HEADER_NAME="X-Ref-Alpha"
		AUTH_HEADER_VALUE="$REF_ALPHA"
	else
		error "Set REF_API_KEY (preferred) or REF_ALPHA before running this script."
	fi
}

mcp_http_post() {
	local payload="$1"
	local body_file="$2"
	local headers_file="$3"
	local -a args=(-sS -X POST "$MCP_URL" -D "$headers_file" -o "$body_file"
		-H 'Content-Type: application/json'
		-H 'Accept: application/json, text/event-stream'
		-H "${AUTH_HEADER_NAME}: ${AUTH_HEADER_VALUE}"
		-H "User-Agent: ${USER_AGENT}")
	if [[ -n "$SESSION_ID" ]]; then
		args+=(-H "mcp-session-id: ${SESSION_ID}")
	fi
	args+=(-d "$payload")
	if ! curl "${args[@]}"; then
		error "Network error talking to MCP endpoint"
	fi
	local status
	status=$(awk 'NR==1 {print $2}' "$headers_file")
	if [[ -z "$status" ]]; then
		status=0
	fi
	if ((status >= 400)); then
		error "HTTP $status from MCP. Body: $(cat "$body_file")"
	fi
	if [[ -z "$SESSION_ID" ]]; then
		local header_line
		header_line=$(grep -i '^mcp-session-id:' "$headers_file" || true)
		if [[ -n "$header_line" ]]; then
			SESSION_ID=$(printf '%s' "$header_line" | awk -F': *' '{print $2}' | tr -d '\r')
		fi
	fi
}

ensure_no_rpc_error() {
	local body_file="$1"
	if [[ "$HAS_JQ" -eq 1 ]]; then
		if jq -e '.error' "$body_file" >/dev/null; then
			local code msg
			code=$(jq -r '.error.code // "unknown"' "$body_file")
			msg=$(jq -r '.error.message // "Unknown MCP error"' "$body_file")
			local data=$(jq -r '.error.data // ""' "$body_file")
			error "MCP error ($code): $msg ${data:+- $data}"
		fi
	else
		if grep -q '"error"' "$body_file"; then
			error "MCP returned an error: $(cat "$body_file")"
		fi
	fi
}

rpc_request() {
	local payload="$1"
	local body_file headers_file
	body_file=$(mktemp -p "$TMP_DIR" ref_body.XXXXXX)
	headers_file=$(mktemp -p "$TMP_DIR" ref_headers.XXXXXX)
	mcp_http_post "$payload" "$body_file" "$headers_file"
	ensure_no_rpc_error "$body_file"
	printf '%s' "$body_file"
}

mcp_initialize() {
	if [[ -n "$SESSION_ID" ]]; then
		return
	fi
	require_auth
	local id payload
	id=$(next_id)
	payload=$(jq -n \
		--argjson init_id "$id" \
		--arg protocol "$PROTOCOL_VERSION" \
		--arg client_name "$CLIENT_NAME" \
		--arg client_version "$CLIENT_VERSION" \
		'{"jsonrpc":"2.0","id":$init_id,"method":"initialize","params":{"protocolVersion":$protocol,"clientInfo":{"name":$client_name,"version":$client_version},"capabilities":{}}}')
	local body_file headers_file
	body_file=$(mktemp -p "$TMP_DIR" ref_init_body.XXXXXX)
	headers_file=$(mktemp -p "$TMP_DIR" ref_init_headers.XXXXXX)
	mcp_http_post "$payload" "$body_file" "$headers_file"
	ensure_no_rpc_error "$body_file"
	if [[ -z "$SESSION_ID" ]]; then
		error "Server did not return mcp-session-id header."
	fi
}

mcp_list_tools() {
	mcp_initialize
	local id payload body_file
	id=$(next_id)
	payload=$(printf '{"jsonrpc":"2.0","id":%s,"method":"tools/list","params":{}}' "$id")
	body_file=$(rpc_request "$payload")
	if [[ "$HAS_JQ" -eq 1 ]]; then
		jq '.result.tools' "$body_file"
	else
		cat "$body_file"
	fi
}

mcp_call_tool() {
	local tool_name="$1"
	local arguments_json="${2-}"
	if [[ -z "$arguments_json" ]]; then
		arguments_json='{}'
	fi
	mcp_initialize
	local id payload
	id=$(next_id)
	if ! jq -e . >/dev/null <<<"$arguments_json" 2>/dev/null; then
		error "Invalid JSON arguments for $tool_name"
	fi
	payload=$(jq -n \
		--argjson call_id "$id" \
		--arg name "$tool_name" \
		--argjson arguments "$arguments_json" \
		'{"jsonrpc":"2.0","id":$call_id,"method":"tools/call","params":{"name":$name,"arguments":$arguments}}')
	rpc_request "$payload"
}

print_text_content() {
	local body_file="$1"
	if [[ "$HAS_JQ" -eq 1 ]]; then
		jq -r '.result.content[]?.text' "$body_file"
	else
		cat "$body_file"
	fi
}

ref_search_documentation() {
	local query="$*"
	if [[ -z "$query" ]]; then
		error "Provide a search query (include language + framework as recommended in docs)."
	fi
	local args_json
	args_json=$(jq -n --arg query "$query" '{query:$query}')
	local body_file
	body_file=$(mcp_call_tool "ref_search_documentation" "$args_json")
	print_text_content "$body_file"
}

ref_read_url() {
	local url="$*"
	if [[ -z "$url" ]]; then
		error "Provide a URL from a Ref search result to read."
	fi
	local args_json
	args_json=$(jq -n --arg url "$url" '{url:$url}')
	local body_file
	body_file=$(mcp_call_tool "ref_read_url" "$args_json")
	print_text_content "$body_file"
}

usage() {
	cat <<'EOF'
ref-mcp.sh — Bash client for Ref MCP tools using curl

Environment:
  REF_API_KEY   Primary authentication (recommended)
  REF_ALPHA     Alternate auth header if API key unavailable
  MCP_URL       Override MCP endpoint (defaults to https://api.ref.tools/mcp)

Subcommands:
  search <query>   Search docs via ref_search_documentation. Include language, framework, and source hints
                   (e.g., "Figma API post comment endpoint documentation" or "n8n Code node ref_src=private").
  read <url>       Read a specific URL returned by search. Outputs markdown trimmed per Ref best practices.
  tools            List available MCP tools exposed by the current server.
  help             Show this message.

Workflow tips from https://docs.ref.tools:
  • Start with `search` to narrow results, then feed exact URLs into `read`.
  • Use precise, sentence-length queries that mention tech stacks.
  • Add `ref_src=private` when you need Ref to search your private docs.
  • Avoid reading arbitrary URLs—stick to Ref search hits to minimize tokens.
EOF
}

main() {
	local cmd="${1:-help}"
	if [[ "$cmd" != "help" && "$cmd" != "-h" && "$cmd" != "--help" ]]; then
		require_auth
	fi
	shift || true
	case "$cmd" in
	search)
		ref_search_documentation "$@"
		;;
	read)
		if [[ $# -lt 1 ]]; then
			error "Usage: $0 read <url>"
		fi
		ref_read_url "$1"
		;;
	tools)
		mcp_list_tools
		;;
	help | -h | --help)
		usage
		;;
	*)
		error "Unknown command '$cmd'. Use 'help' for usage."
		;;
	esac
}

main "$@"
