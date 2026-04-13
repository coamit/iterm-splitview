#!/bin/bash
# iterm-pane.sh — iTerm2 pane management (profiles, splits, close)

readonly _PANE_CACHE_TTL=60
readonly _SERVER_READY_RETRIES=10
readonly _SERVER_READY_DELAY=0.15

_close_fileview_pane() {
  if [ ! -f "$PANE_SESSION_ID_FILE" ]; then
    return 0
  fi
  local pane_id
  pane_id=$(cat "$PANE_SESSION_ID_FILE")
  if [ -z "$pane_id" ]; then
    rm -f "$PANE_SESSION_ID_FILE"
    return 0
  fi
  osascript <<APPLESCRIPT
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if unique ID of s is "$pane_id" then
              tell s to close
              return
            end if
          end repeat
        end repeat
      end repeat
    end tell
APPLESCRIPT
  rm -f "$PANE_SESSION_ID_FILE"
}

_ensure_dynamic_profile() {
  mkdir -p "$_DYNAMIC_PROFILES_DIR"
  local url
  url=$(_build_server_url)
  cat > "$_PROFILE_FILE" << PROFILE
{
  "Profiles": [{
    "Name": "$_PROFILE_NAME",
    "Guid": "FILEVIEW-$_FV_SESSION_ID",
    "Dynamic Profile Parent Name": "Web Browser",
    "Custom Command": "Browser",
    "Initial URL": "$url"
  }]
}
PROFILE
  sleep 0.15
}

_build_server_url() {
  if [ -f "$SERVER_PORT_FILE" ]; then
    local port
    port=$(cat "$SERVER_PORT_FILE")
    echo "http://localhost:${port}/index.html"
  else
    echo "file://$VIEW_HTML"
  fi
}

# Check if tracked pane still exists via AppleScript
_query_pane_alive() {
  local tracked_pane_id="$1"
  local pane_exists
  pane_exists=$(osascript 2>/dev/null <<APPLESCRIPT
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if unique ID of s is "$tracked_pane_id" then return "yes"
          end repeat
        end repeat
      end repeat
      return "no"
    end tell
APPLESCRIPT
  ) || pane_exists="no"
  [ "$pane_exists" = "yes" ]
}

# Check if tracked pane still exists (with TTL cache)
_check_pane_exists() {
  local tracked_pane_id="$1"
  local file_age
  file_age=$(_pane_file_age)

  # Cache hit: file was touched recently, assume pane is alive
  if [ "$file_age" -lt "$_PANE_CACHE_TTL" ]; then
    return 0
  fi

  # Cache miss: ask iTerm directly
  if _query_pane_alive "$tracked_pane_id"; then
    touch "$PANE_SESSION_ID_FILE"
    return 0
  fi

  # Pane is dead — clean up stale session ID
  rm -f "$PANE_SESSION_ID_FILE"
  return 1
}

_pane_file_age() {
  local file_mtime now_epoch
  file_mtime=$(stat -f %m "$PANE_SESSION_ID_FILE" 2>/dev/null || echo 0)
  now_epoch=$(date +%s)
  echo $(( now_epoch - file_mtime ))
}

_wait_for_server() {
  if [ ! -f "$SERVER_PORT_FILE" ]; then
    return 1
  fi
  local port attempt
  port=$(cat "$SERVER_PORT_FILE")
  for (( attempt = 0; attempt < _SERVER_READY_RETRIES; attempt++ )); do
    if curl -sf "http://localhost:${port}/_gen" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$_SERVER_READY_DELAY"
  done
  return 1
}

_create_split_pane() {
  local session_uuid="$1"
  _wait_for_server || true
  _ensure_dynamic_profile
  local new_pane_id
  new_pane_id=$(osascript <<APPLESCRIPT
    tell application "iTerm2"
      repeat with w in windows
        repeat with t in tabs of w
          repeat with s in sessions of t
            if unique ID of s is "$session_uuid" then
              tell s
                set newSession to (split vertically with profile "$_PROFILE_NAME")
              end tell
              return unique ID of newSession
            end if
          end repeat
        end repeat
      end repeat
    end tell
APPLESCRIPT
  )
  if [ -n "$new_pane_id" ]; then
    echo "$new_pane_id" > "$PANE_SESSION_ID_FILE"
  fi
  rm -f "$_PROFILE_FILE"
}

_open_or_reuse_pane() {
  local session_uuid="${ITERM_SESSION_ID#*:}"

  if [ -f "$PANE_SESSION_ID_FILE" ]; then
    local tracked_pane_id
    tracked_pane_id=$(cat "$PANE_SESSION_ID_FILE")
    if [ -n "$tracked_pane_id" ]; then
      # Always verify pane is alive — bypass cache on open
      if _query_pane_alive "$tracked_pane_id"; then
        touch "$PANE_SESSION_ID_FILE"
        return 0
      fi
      # Pane is dead — clean up stale file
      rm -f "$PANE_SESSION_ID_FILE"
    else
      rm -f "$PANE_SESSION_ID_FILE"
    fi
  fi

  _create_split_pane "$session_uuid"
}
