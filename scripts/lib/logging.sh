#!/bin/bash
# logging.sh — Session log file creation, structured JSONL logging, and rotation

readonly _FV_LOG_DIR="$HOME/.local/share/fileview/logs"
readonly _FV_LOG_ROTATE_KEEP=20

_fv_log_path() {
  cat "$_FV_SESSION_DIR/logfile" 2>/dev/null
}

_fv_log_init() {
  mkdir -p "$_FV_LOG_DIR"
  local session_id timestamp log_file
  session_id="${_FV_SESSION_ID:-default}"
  timestamp=$(date +%Y%m%d-%H%M%S)
  log_file="$_FV_LOG_DIR/${session_id}_${timestamp}.log"
  echo "$log_file" > "$_FV_SESSION_DIR/logfile"
  _fv_log_rotate
  _fv_log "session_start" "{\"session\":\"$session_id\"}"
}

_fv_log() {
  local op="${1:-unknown}" data="${2:-{}}"
  local log_file ts
  log_file=$(_fv_log_path) || return 0
  [ -z "$log_file" ] && return 0
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"ts":"%s","src":"server","lvl":"info","op":"%s","data":%s}\n' \
    "$ts" "$op" "$data" >> "$log_file"
}

_fv_log_error() {
  local op="${1:-unknown}" data="${2:-{}}"
  local log_file ts
  log_file=$(_fv_log_path) || return 0
  [ -z "$log_file" ] && return 0
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"ts":"%s","src":"server","lvl":"error","op":"%s","data":%s}\n' \
    "$ts" "$op" "$data" >> "$log_file"
}

_fv_log_rotate() {
  local count
  count=$(ls -1 "$_FV_LOG_DIR"/*.log 2>/dev/null | wc -l)
  if [ "$count" -gt "$_FV_LOG_ROTATE_KEEP" ]; then
    ls -t "$_FV_LOG_DIR"/*.log 2>/dev/null | tail -n +"$(( _FV_LOG_ROTATE_KEEP + 1 ))" | xargs rm -f
  fi
}
