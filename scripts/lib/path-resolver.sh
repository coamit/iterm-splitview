#!/bin/bash
# paths.sh — Path resolution utilities

_resolve_path() {
  local p="$1"
  if [[ "$p" != /* ]]; then
    local dir
    dir=$(cd "$(dirname "$p")" 2>/dev/null && pwd)
    if [ -n "$dir" ]; then
      p="$dir/$(basename "$p")"
    fi
  fi
  echo "$p"
}
