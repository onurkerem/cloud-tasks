#!/usr/bin/env bash
set -euo pipefail
umask 077

VERSION="1.0.0"
SERVER_NAME="cloud-tasks"
PROTOCOL_VERSION="2025-06-18"

PY_JSON=""
PY_TOML=""
trap 'rm -f "${PY_JSON:-}" "${PY_TOML:-}" 2>/dev/null || true' EXIT
trap 'exit 130' INT

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'; C_RED=$'\033[1;31m'; C_DIM=$'\033[2m'
else
  C_RESET=""; C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_DIM=""
fi

info() { printf '%scloud-tasks:%s %s\n' "$C_BOLD" "$C_RESET" "$*"; }
note() { printf '%s%s%s\n' "$C_DIM" "$*" "$C_RESET"; }
ok()   { printf '%s✓%s  %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s!%s  %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
err()  { printf '%s✗%s  %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
die()  { err "$@"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1$2"
}

banner() {
  cat <<EOF
${C_BOLD}cloud-tasks MCP installer${C_RESET} ${C_DIM}v${VERSION}${C_RESET}
Connect opencode, Claude Code, Codex, or Antigravity to a deployed Cloud Tasks MCP server.
EOF
}

usage() {
  cat <<EOF
Usage: install.sh [options]

  --url URL          Cloud Tasks MCP endpoint (e.g. https://your-host/mcp)
  --api-key KEY      API key sent as 'Authorization: Bearer KEY'
  --agents LIST      Comma-separated: opencode,claude,codex,antigravity  (or 'all')
  --yes              Non-interactive: skip confirmation prompts (needs the three above)
  --dry-run          Show what would change; write nothing
  --skip-test        Skip the optional connectivity test
  -h, --help         Show this help

With no options the script runs interactively. Requires bash + python3. macOS/Linux only.
EOF
}

OPT_URL=""
OPT_KEY=""
OPT_AGENTS=""
OPT_YES=0
OPT_DRYRUN=0
OPT_SKIPTEST=0

need_val() { [ "$#" -ge 2 ] || die "Option $1 requires a value"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --url) need_val "$@"; OPT_URL="$2"; shift 2;;
    --api-key) need_val "$@"; OPT_KEY="$2"; shift 2;;
    --agents) need_val "$@"; OPT_AGENTS="$2"; shift 2;;
    --yes) OPT_YES=1; shift;;
    --dry-run) OPT_DRYRUN=1; shift;;
    --skip-test) OPT_SKIPTEST=1; shift;;
    -h|--help) usage; exit 0;;
    *) die "Unknown option: $1 (try --help)";;
  esac
done

case "$(uname -s)" in
  Darwin|Linux) : ;;
  *) die "Unsupported OS: $(uname -s). This installer supports macOS and Linux.";;
esac

[ -n "${HOME:-}" ] || die "HOME is not set."
require_cmd python3 " (https://www.python.org/downloads/)"
require_cmd mktemp ""

if [ "$OPT_YES" -eq 1 ]; then
  [ -n "$OPT_URL" ] || die "--yes requires --url"
  [ -n "$OPT_KEY" ] || die "--yes requires --api-key"
  [ -n "$OPT_AGENTS" ] || die "--yes requires --agents"
fi

setup_python() {
  PY_JSON=$(mktemp) || die "mktemp failed"
  PY_TOML=$(mktemp) || die "mktemp failed"
  chmod 600 "$PY_JSON" "$PY_TOML"

  cat > "$PY_JSON" <<'PY'
import os, sys, json
f = os.environ["CT_FILE"]
path = json.loads(os.environ["CT_PATH"])
kind = os.environ["CT_KIND"]
url = os.environ["CT_URL"]
key = os.environ["CT_KEY"]
auth = "Bearer " + key
if kind == "opencode":
    value = {"type": "remote", "url": url, "headers": {"Authorization": auth}}
elif kind == "claude":
    value = {"type": "http", "url": url, "headers": {"Authorization": auth}}
elif kind == "antigravity":
    value = {"serverUrl": url, "headers": {"Authorization": auth}}
else:
    sys.stderr.write("internal: unknown kind\n")
    sys.exit(99)

try:
    with open(f) as fh:
        data = json.load(fh)
except FileNotFoundError:
    data = {}
except json.JSONDecodeError as e:
    sys.stderr.write("%s is not valid JSON: %s\n" % (f, e))
    sys.exit(2)
if not isinstance(data, dict):
    sys.stderr.write("%s: top-level JSON is not an object\n" % f)
    sys.exit(2)

cur = data
for k in path[:-1]:
    nxt = cur.get(k)
    if not isinstance(nxt, dict):
        nxt = {}
        cur[k] = nxt
    cur = nxt
prev = cur.get(path[-1])
cur[path[-1]] = value

text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
d = os.path.dirname(f) or "."
if not os.path.isdir(d):
    os.makedirs(d, exist_ok=True)
with open(f, "w") as fh:
    fh.write(text)
os.chmod(f, 0o600)
if prev is None:
    print("created")
elif prev == value:
    print("unchanged")
else:
    print("updated")
PY

  cat > "$PY_TOML" <<'PY'
import os, sys, re
f = os.environ["CT_FILE"]
url = os.environ["CT_URL"]
key = os.environ["CT_KEY"]
auth = "Bearer " + key

def q(s):
    import json
    return json.dumps(s)

block = '[mcp_servers."cloud-tasks"]\nurl = %s\nhttp_headers = { Authorization = %s }\n' % (q(url), q(auth))

try:
    with open(f) as fh:
        text = fh.read()
except FileNotFoundError:
    text = ""

try:
    import tomllib
    has_toml = True
except Exception:
    try:
        import tomli as tomllib  # type: ignore
        has_toml = True
    except Exception:
        tomllib = None
        has_toml = False

if has_toml and text.strip():
    try:
        tomllib.loads(text)
    except Exception as e:
        sys.stderr.write("%s is not valid TOML; fix it first: %s\n" % (f, e))
        sys.exit(2)

hdr = re.compile(r'^\[mcp_servers\.(?:"cloud-tasks"|\'cloud-tasks\'|cloud-tasks)\]\s*$', re.M)
lines = text.split("\n")
start = None
for i, l in enumerate(lines):
    if hdr.match(l):
        start = i
        break

if start is None:
    prefix = text
    if prefix and not prefix.endswith("\n"):
        prefix += "\n"
    if prefix:
        prefix += "\n"
    new_text = prefix + block
    action = "created"
else:
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if lines[j].startswith("["):
            end = j
            break
    new_lines = lines[:start] + block.rstrip("\n").split("\n") + lines[end:]
    new_text = "\n".join(new_lines)
    action = "updated"

if has_toml:
    try:
        d = tomllib.loads(new_text)
        got = d.get("mcp_servers", {}).get("cloud-tasks", {})
        if got.get("url") != url or got.get("http_headers", {}).get("Authorization") != auth:
            sys.stderr.write("Post-write validation mismatch; aborting before write.\n")
            sys.exit(2)
    except SystemExit:
        raise
    except Exception as e:
        sys.stderr.write("Result would be invalid TOML: %s; aborting before write.\n" % e)
        sys.exit(2)

d = os.path.dirname(f) or "."
if not os.path.isdir(d):
    os.makedirs(d, exist_ok=True)
with open(f, "w") as fh:
    fh.write(new_text)
os.chmod(f, 0o600)
print(action)
PY
}

confirm() {
  [ "$OPT_YES" -eq 1 ] && return 0
  local prompt="$1" def="${2:-y}" reply hint
  if [ "$def" = "y" ]; then hint="[Y/n]"; else hint="[y/N]"; fi
  printf '%s %s ' "$prompt" "$hint" >&2
  IFS= read -r reply || reply=""
  reply="${reply:-$def}"
  case "$reply" in
    y|Y|yes|YES|Yes) return 0;;
    *) return 1;;
  esac
}

ask() {
  local var="$1" prompt="$2"
  printf '%s ' "$prompt" >&2
  IFS= read -r "${var:?}" || die "No input"
}

read_secret() {
  local var="$1" prompt="$2"
  printf '%s ' "$prompt" >&2
  IFS= read -rs "${var:?}" || die "No input"
  printf '\n' >&2
}

opencode_file()    { printf '%s/opencode/opencode.json\n' "${XDG_CONFIG_HOME:-$HOME/.config}"; }
claude_file()      { printf '%s/.claude.json\n' "$HOME"; }
codex_file()       { printf '%s/config.toml\n' "${CODEX_HOME:-$HOME/.codex}"; }
antigravity_file() { printf '%s/config/mcp_config.json\n' "${GEMINI_HOME:-$HOME/.gemini}"; }

backup_file() {
  local f="$1" ts bak i
  [ -e "$f" ] || return 0
  ts=$(date +%Y%m%d-%H%M%S)
  bak="${f}.cloud-tasks.bak.${ts}"
  if [ -e "$bak" ]; then
    i=1
    while [ -e "${bak}.${i}" ]; do i=$((i + 1)); done
    bak="${bak}.${i}"
  fi
  cp "$f" "$bak" || die "Failed to back up $f"
  note "Backed up $f -> $bak"
}

plan() {
  local agent="$1" f="$2"
  note "DRY-RUN [$agent]: would merge only the '$SERVER_NAME' entry into $f (backup first, no other keys touched)"
}

report() {
  local agent="$1" f="$2" status="$3"
  case "$status" in
    created)   ok "$agent: added '$SERVER_NAME' to $f";;
    updated)   ok "$agent: updated '$SERVER_NAME' in $f";;
    unchanged) ok "$agent: '$SERVER_NAME' already configured in $f (no change)";;
    *)         ok "$agent: $f ($status)";;
  esac
  note "Permissions set to 600 (owner-only) since this file now holds your API key."
}

test_connection() {
  local url="$1" key="$2" rc=0
  info "Testing connection to $url ..."
  CT_URL="$url" CT_KEY="$key" CT_PROTO="$PROTOCOL_VERSION" python3 - <<'PY' || rc=$?
import os, sys, json, urllib.request, urllib.error
url = os.environ["CT_URL"]
key = os.environ["CT_KEY"]
proto = os.environ.get("CT_PROTO", "2025-06-18")
payload = {
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {"protocolVersion": proto, "capabilities": {},
               "clientInfo": {"name": "cloud-tasks-installer", "version": "1.0.0"}},
}
req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("Accept", "application/json, text/event-stream")
req.add_header("Authorization", "Bearer " + key)
req.add_header("User-Agent", "cloud-tasks-installer/1.0")
code = None
body = ""
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        code = r.status
        body = r.read().decode("utf-8", "replace")
except urllib.error.HTTPError as e:
    code = e.code
    try:
        body = e.read().decode("utf-8", "replace")
    except Exception:
        body = ""
except Exception as e:
    sys.stderr.write("  Connection failed: %s\n" % e)
    sys.exit(1)
if code in (401, 403):
    sys.stderr.write("  HTTP %s — rejected. Check your API key.\n" % code)
    sys.exit(1)
if code is None or not (200 <= int(code) < 300):
    sys.stderr.write("  HTTP %s — unexpected response. Check the URL.\n" % code)
    sys.exit(1)
result = None
for line in body.splitlines():
    if line.startswith("data: "):
        try:
            result = json.loads(line[6:])
        except Exception:
            pass
if result is None:
    try:
        result = json.loads(body)
    except Exception:
        result = None
if not isinstance(result, dict) or "result" not in result:
    sys.stderr.write("  Reached the server but got no MCP initialize result. Is this the /mcp endpoint?\n")
    sys.exit(1)
si = (result.get("result") or {}).get("serverInfo") or {}
name = si.get("name", "?")
ver = si.get("version", "?")
print("  Connected. Server: %s %s" % (name, ver))
if name != "cloud-tasks":
    sys.stderr.write("  Note: server name is '%s', expected 'cloud-tasks'.\n" % name)
PY
  if [ "$rc" -eq 0 ]; then
    ok "Connection test passed."
  else
    warn "Connection test did not pass (you can still continue)."
  fi
  return "$rc"
}

install_opencode() {
  local f status
  f=$(opencode_file)
  if [ "$OPT_DRYRUN" -eq 1 ]; then plan "opencode" "$f"; return; fi
  backup_file "$f"
  status=$(CT_FILE="$f" CT_PATH='["mcp","cloud-tasks"]' CT_KIND=opencode \
           CT_URL="$URL" CT_KEY="$KEY" python3 "$PY_JSON") \
    || die "Failed to configure opencode ($f)."
  report "opencode" "$f" "$status"
}

install_claude() {
  local f status
  f=$(claude_file)
  if command -v claude >/dev/null 2>&1; then
    if [ "$OPT_DRYRUN" -eq 1 ]; then
      note "DRY-RUN [claude]: would run 'claude mcp add --transport http $SERVER_NAME $URL --header \"Authorization: Bearer ***\" --scope user'"
      return
    fi
    backup_file "$f"
    claude mcp remove "$SERVER_NAME" --scope user >/dev/null 2>&1 || true
    if claude mcp add --transport http "$SERVER_NAME" "$URL" \
          --header "Authorization: Bearer $KEY" --scope user >/dev/null 2>&1; then
      ok "claude: configured via 'claude mcp add' ($SERVER_NAME, user scope)."
      note "Verify with: claude mcp list"
    else
      warn "claude mcp add failed; falling back to editing $f"
      status=$(CT_FILE="$f" CT_PATH='["mcpServers","cloud-tasks"]' CT_KIND=claude \
               CT_URL="$URL" CT_KEY="$KEY" python3 "$PY_JSON") \
        || die "Failed to configure Claude Code ($f)."
      report "claude" "$f" "$status"
    fi
    return
  fi
  if [ "$OPT_DRYRUN" -eq 1 ]; then plan "claude" "$f"; return; fi
  backup_file "$f"
  status=$(CT_FILE="$f" CT_PATH='["mcpServers","cloud-tasks"]' CT_KIND=claude \
           CT_URL="$URL" CT_KEY="$KEY" python3 "$PY_JSON") \
    || die "Failed to configure Claude Code ($f)."
  note "claude CLI not found on PATH; edited $f directly."
  report "claude" "$f" "$status"
}

install_codex() {
  local f status rc=0
  f=$(codex_file)
  if [ "$OPT_DRYRUN" -eq 1 ]; then plan "codex" "$f"; return; fi
  backup_file "$f"
  status=$(CT_FILE="$f" CT_URL="$URL" CT_KEY="$KEY" python3 "$PY_TOML") || rc=$?
  [ "$rc" -eq 0 ] || die "Failed to configure Codex ($f)."
  report "codex" "$f" "$status"
}

install_antigravity() {
  local f status
  f=$(antigravity_file)
  if [ "$OPT_DRYRUN" -eq 1 ]; then plan "antigravity" "$f"; return; fi
  backup_file "$f"
  status=$(CT_FILE="$f" CT_PATH='["mcpServers","cloud-tasks"]' CT_KIND=antigravity \
           CT_URL="$URL" CT_KEY="$KEY" python3 "$PY_JSON") \
    || die "Failed to configure Antigravity ($f)."
  report "antigravity" "$f" "$status"
}

setup_python
banner

URL=""
KEY=""
selected=()

if [ -n "$OPT_URL" ]; then
  URL="$OPT_URL"
else
  while true; do
    ask URL "Cloud Tasks MCP URL (e.g. https://your-host/mcp):"
    [ -n "$URL" ] || { warn "URL is required."; continue; }
    break
  done
fi
case "$URL" in
  http://*|https://*) : ;;
  *) die "URL must start with http:// or https:// (got: $URL).";;
esac
case "$URL" in
  */mcp) : ;;
  *) warn "URL does not end with /mcp — make sure this is the MCP endpoint.";;
esac

if [ -n "$OPT_KEY" ]; then
  KEY="$OPT_KEY"
else
  while true; do
    read_secret KEY "API key (input hidden):"
    [ -n "$KEY" ] || { warn "API key is required."; continue; }
    break
  done
fi

ALL_AGENTS=(opencode claude codex antigravity)
if [ -n "$OPT_AGENTS" ]; then
  IFS=',' read -ra parts <<< "$OPT_AGENTS"
  for p in "${parts[@]}"; do
    p="${p// /}"
    [ -z "$p" ] && continue
    case "$p" in
      all) selected=("${ALL_AGENTS[@]}"); break;;
      opencode|claude|codex|antigravity) selected+=("$p");;
      *) die "Unknown agent: $p (choose: opencode, claude, codex, antigravity)";;
    esac
  done
else
  printf '\n'
  info "Which agents should connect to Cloud Tasks?"
  printf '  %s1%s) opencode\n' "$C_BOLD" "$C_RESET"
  printf '  %s2%s) Claude Code\n' "$C_BOLD" "$C_RESET"
  printf '  %s3%s) Codex\n' "$C_BOLD" "$C_RESET"
  printf '  %s4%s) Antigravity\n' "$C_BOLD" "$C_RESET"
  while true; do
    printf 'Enter numbers (comma-separated) or "all": ' >&2
    IFS= read -r reply || die "No input"
    reply="${reply// /}"
    if [ "$reply" = "all" ]; then
      selected=("${ALL_AGENTS[@]}")
      break
    fi
    [ -n "$reply" ] || { warn "Pick at least one."; continue; }
    IFS=',' read -ra idx <<< "$reply"
    selected=()
    bad=0
    for n in "${idx[@]}"; do
      case "$n" in
        1) selected+=(opencode);;
        2) selected+=(claude);;
        3) selected+=(codex);;
        4) selected+=(antigravity);;
        *) bad=1;;
      esac
    done
    if [ "$bad" = "1" ] || [ "${#selected[@]}" -eq 0 ]; then
      warn "Invalid selection, try again."
      continue
    fi
    break
  done
fi
[ "${#selected[@]}" -gt 0 ] || die "No agents selected."

if [ "$OPT_SKIPTEST" -eq 0 ] && [ "$OPT_YES" -eq 0 ]; then
  if confirm "Test connection to $URL now? (recommended)" y; then
    test_connection "$URL" "$KEY" || true
  fi
fi

printf '\n'
info "Ready to configure: ${selected[*]}"
if [ "$OPT_DRYRUN" -eq 1 ]; then
  note "(dry-run mode — no files will be changed)"
else
  confirm "Proceed?" y || { note "Aborted. No changes were made."; exit 0; }
fi

for a in "${selected[@]}"; do
  case "$a" in
    opencode)    install_opencode;;
    claude)      install_claude;;
    codex)       install_codex;;
    antigravity) install_antigravity;;
  esac
done

printf '\n'
ok "Done. Restart any running agent, then ask it to list its MCP tools."
note "Cloud Tasks tools: create_task, list_tasks, get_task, update_task, delete_task, claim_next_task."
exit 0
