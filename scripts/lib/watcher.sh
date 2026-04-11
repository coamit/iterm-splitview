#!/bin/bash
# watcher.sh — File change watcher + live git tracking for auto-reload

stop_watcher() {
  if [ -f "$WATCHER_PID" ]; then
    local pid
    pid=$(cat "$WATCHER_PID")
    kill "$pid" 2>/dev/null || true
    rm -f "$WATCHER_PID"
  fi
}

_collect_mtimes() {
  local result=""
  for tabfile in "$TABS_FILE" "$TABS_GIT_FILE"; do
    [ -f "$tabfile" ] && [ -s "$tabfile" ] || continue
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      result="${result}$(stat -f %m "$fp" 2>/dev/null || echo 0):"
    done < "$tabfile"
  done
  echo "$result"
}

_detect_git_root() {
  # Try active file dir, then CWD
  local active_path=""
  [ -f "$ACTIVE_FILE" ] && active_path=$(cat "$ACTIVE_FILE" 2>/dev/null)
  local dirs_to_try=()
  [ -n "$active_path" ] && dirs_to_try+=("$(dirname "$active_path")")
  [ -f "$CWD_FILE" ] && dirs_to_try+=("$(cat "$CWD_FILE" 2>/dev/null)")
  for d in "${dirs_to_try[@]}"; do
    [ -d "$d" ] || continue
    local root
    root=$(git -C "$d" rev-parse --show-toplevel 2>/dev/null) && { echo "$root"; return; }
  done
}

_sync_git_tabs() {
  local git_root="$1"
  [ -z "$git_root" ] && return 1

  # Get current git changes
  local changed
  changed=$({ git -C "$git_root" diff --name-only 2>/dev/null
              git -C "$git_root" diff --name-only --cached 2>/dev/null
              git -C "$git_root" ls-files --others --exclude-standard 2>/dev/null
            } | sort -u)

  # Build set of absolute paths of changed files
  local new_set=""
  while IFS= read -r cf; do
    [ -z "$cf" ] && continue
    local abs_path
    abs_path=$(cd "$git_root" && realpath "$cf" 2>/dev/null || echo "")
    [ -f "$abs_path" ] && new_set="${new_set}${abs_path}"$'\n'
  done <<< "$changed"
  new_set=$(echo "$new_set" | sort -u | sed '/^$/d')

  # Compare with existing tabs.git
  local existing=""
  [ -f "$TABS_GIT_FILE" ] && existing=$(sort "$TABS_GIT_FILE" | sed '/^$/d')

  if [ "$new_set" != "$existing" ]; then
    echo "$new_set" > "$TABS_GIT_FILE"
    return 0  # changed
  fi
  return 1  # no change
}

start_watcher() {
  stop_watcher
  (
    local last_mtimes
    last_mtimes=$(_collect_mtimes)
    local git_root
    git_root=$(_detect_git_root)
    local git_poll_counter=0

    # Initial git sync
    [ -n "$git_root" ] && _sync_git_tabs "$git_root" && generate_tabbed_html

    while true; do
      sleep 2

      # Check file content changes
      local cur_mtimes
      cur_mtimes=$(_collect_mtimes)
      local needs_regen=false
      if [ "$cur_mtimes" != "$last_mtimes" ]; then
        last_mtimes="$cur_mtimes"
        needs_regen=true
      fi

      # Poll git status every ~6s (every 3rd cycle)
      git_poll_counter=$((git_poll_counter + 1))
      if [ $git_poll_counter -ge 3 ]; then
        git_poll_counter=0
        # Re-detect git root in case active file changed
        git_root=$(_detect_git_root)
        if [ -n "$git_root" ]; then
          if _sync_git_tabs "$git_root"; then
            needs_regen=true
            last_mtimes=$(_collect_mtimes)
          fi
        fi
      fi

      if [ "$needs_regen" = true ]; then
        generate_tabbed_html
      fi
    done
  ) &
  echo $! > "$WATCHER_PID"
}
