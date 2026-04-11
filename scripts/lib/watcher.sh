#!/bin/bash
# watcher.sh — File change watcher for auto-reload

stop_watcher() {
  if [ -f "$WATCHER_PID" ]; then
    local pid
    pid=$(cat "$WATCHER_PID")
    kill "$pid" 2>/dev/null
    rm -f "$WATCHER_PID"
  fi
}

# Watch all files in TABS_FILE for changes, regenerate HTML when any file changes
start_watcher() {
  stop_watcher
  if [ ! -f "$TABS_FILE" ] || [ ! -s "$TABS_FILE" ]; then
    return 0
  fi
  (
    last_mtimes=""
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      last_mtimes="${last_mtimes}$(stat -f %m "$fp" 2>/dev/null || echo 0):"
    done < "$TABS_FILE"

    while true; do
      sleep 2
      cur_mtimes=""
      while IFS= read -r fp; do
        [ -z "$fp" ] && continue
        cur_mtimes="${cur_mtimes}$(stat -f %m "$fp" 2>/dev/null || echo 0):"
      done < "$TABS_FILE"
      if [ "$cur_mtimes" != "$last_mtimes" ]; then
        last_mtimes="$cur_mtimes"
        generate_tabbed_html
      fi
    done
  ) &
  echo $! > "$WATCHER_PID"
}
