#!/bin/bash
# iterm.sh — iTerm2 pane management (profiles, splits, close)

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
  if [ -f "$SERVER_PORT_FILE" ]; then
    local port
    port=$(cat "$SERVER_PORT_FILE")
    url="http://localhost:${port}/index.html"
  else
    url="file://$VIEW_HTML"
  fi
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

# Check if tracked pane still exists (with 60s cache)
_check_pane_exists() {
  local tracked_pane_id="$1"
  local file_age=999
  if command -v stat &>/dev/null; then
    local file_mtime now_epoch
    file_mtime=$(stat -f %m "$PANE_SESSION_ID_FILE" 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    file_age=$(( now_epoch - file_mtime ))
  fi

  if [ "$file_age" -lt 60 ]; then
    return 0
  fi

  local pane_exists
  pane_exists=$(osascript <<APPLESCRIPT
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
  )
  if [ "$pane_exists" = "yes" ]; then
    touch "$PANE_SESSION_ID_FILE"
    return 0
  fi
  rm -f "$PANE_SESSION_ID_FILE"
  return 1
}

_create_split_pane() {
  local session_uuid="$1"
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
  echo "$new_pane_id" > "$PANE_SESSION_ID_FILE"
  rm -f "$_PROFILE_FILE"
}

_open_or_reuse_pane() {
  local session_uuid="${ITERM_SESSION_ID#*:}"

  if [ -f "$PANE_SESSION_ID_FILE" ]; then
    local tracked_pane_id
    tracked_pane_id=$(cat "$PANE_SESSION_ID_FILE")
    if [ -n "$tracked_pane_id" ] && _check_pane_exists "$tracked_pane_id"; then
      return 0
    fi
  fi

  _create_split_pane "$session_uuid"
}
