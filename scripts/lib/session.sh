#!/bin/bash
# config.sh — Session directories, paths, and constants
# shellcheck disable=SC2034  # Variables are used by sourcing scripts

_FV_SESSION_ID="${ITERM_SESSION_ID%%:*}"
_FV_SESSION_DIR="/tmp/fileview/${_FV_SESSION_ID:-default}"
mkdir -p "$_FV_SESSION_DIR"

VIEW_HTML="$_FV_SESSION_DIR/index.html"
VIEW_TEMPLATE="/tmp/fileview/template.html"
TABS_FILE="$_FV_SESSION_DIR/tabs"
ACTIVE_FILE="$_FV_SESSION_DIR/active"
WATCHER_PID="$_FV_SESSION_DIR/watcher.pid"
SERVER_PID_FILE="$_FV_SESSION_DIR/server.pid"
SERVER_PORT_FILE="$_FV_SESSION_DIR/server_port"
CWD_FILE="$_FV_SESSION_DIR/cwd"
SEARCH_ROOT_FILE="$_FV_SESSION_DIR/search_root"
WATCHED_FILE="$_FV_SESSION_DIR/watched"
COLLAPSED_FILE="$_FV_SESSION_DIR/collapsed"

# Returns the tab file path for a watched repo by display name
_git_tabs_file() {
  local display_name="$1"
  # Sanitize name for filesystem (replace / and spaces)
  local safe_name="${display_name// /_}"
  safe_name="${safe_name////_}"
  echo "$_FV_SESSION_DIR/tabs.git.${safe_name}"
}

# Parse a WATCHED_FILE line into git_root and display_name
# Format: "git_root|display_name" or legacy "git_root"
_parse_watched_line() {
  local line="$1"
  WATCHED_GIT_ROOT="${line%%|*}"
  if [[ "$line" == *"|"* ]]; then
    WATCHED_DISPLAY_NAME="${line#*|}"
  else
    WATCHED_DISPLAY_NAME=$(basename "$WATCHED_GIT_ROOT")
  fi
}

# Look up the display name for a git root from the WATCHED_FILE
_lookup_repo_name() {
  local git_root="$1"
  [ -f "$WATCHED_FILE" ] || return 1
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    _parse_watched_line "$line"
    if [ "$WATCHED_GIT_ROOT" = "$git_root" ]; then
      echo "$WATCHED_DISPLAY_NAME"
      return 0
    fi
  done < "$WATCHED_FILE"
  return 1
}

# Check if a display name is already taken by another repo
_name_is_taken() {
  local display_name="$1"
  [ -f "$WATCHED_FILE" ] || return 1
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    _parse_watched_line "$line"
    if [ "$WATCHED_DISPLAY_NAME" = "$display_name" ]; then
      return 0
    fi
  done < "$WATCHED_FILE"
  return 1
}

# Generate a unique display name for a repo, disambiguating if needed
_disambiguate_repo_name() {
  local git_root="$1"
  local base_name
  base_name=$(basename "$git_root")
  if ! _name_is_taken "$base_name"; then
    echo "$base_name"
    return
  fi
  # Append parent directory name to disambiguate
  local parent_name
  parent_name=$(basename "$(dirname "$git_root")")
  local candidate="${parent_name}/${base_name}"
  if ! _name_is_taken "$candidate"; then
    echo "$candidate"
    return
  fi
  # Last resort: use full path
  echo "$git_root"
}
PANE_SESSION_ID_FILE="$_FV_SESSION_DIR/pane_session_id"
mkdir -p /tmp/fileview

_DYNAMIC_PROFILES_DIR="$HOME/Library/Application Support/iTerm2/DynamicProfiles"
_PROFILE_FILE="$_DYNAMIC_PROFILES_DIR/fileview-${_FV_SESSION_ID:-default}.json"
_PROFILE_NAME="FileView-${_FV_SESSION_ID:-default}"
