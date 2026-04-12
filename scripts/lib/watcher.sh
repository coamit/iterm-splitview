#!/bin/bash
# watcher.sh — File change watcher + live git tracking for auto-reload
# shellcheck disable=SC2153  # Variables are defined in config.sh

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
  # Collect from files tab
  if [ -f "$TABS_FILE" ] && [ -s "$TABS_FILE" ]; then
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      result="${result}$(stat -f %m "$fp" 2>/dev/null || echo 0):"
    done < "$TABS_FILE"
  fi
  # Collect from all git tab files
  for gtf in "$_FV_SESSION_DIR"/tabs.git.*; do
    [ -f "$gtf" ] && [ -s "$gtf" ] || continue
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      result="${result}$(stat -f %m "$fp" 2>/dev/null || echo 0):"
    done < "$gtf"
  done
  echo "$result"
}

_sync_repo_tabs() {
  local git_root="$1" tabs_file="$2"
  [ -z "$git_root" ] && return 1
  [ -z "$tabs_file" ] && return 1

  # Read diff mode setting (branch = PR-style, local = uncommitted only)
  local diff_mode="branch"
  local settings_file="$_FV_SESSION_DIR/git_settings"
  [ ! -f "$settings_file" ] && settings_file="$HOME/.config/fileview/git_settings"
  if [ -f "$settings_file" ]; then
    local mode_val
    mode_val=$(python3 -c "import json,sys; print(json.loads(open(sys.argv[1]).read()).get('diff_mode','branch'))" "$settings_file" 2>/dev/null)
    [ -n "$mode_val" ] && diff_mode="$mode_val"
  fi

  local changed=""
  if [ "$diff_mode" = "local" ]; then
    # Local changes only: unstaged + staged + untracked
    changed=$({ timeout 5 git -C "$git_root" diff --name-only 2>/dev/null
                timeout 5 git -C "$git_root" diff --name-only --cached 2>/dev/null
                timeout 5 git -C "$git_root" ls-files --others --exclude-standard 2>/dev/null | head -50
              } | sort -u | head -100)
  else
    # Branch mode: all changes since diverging from origin/main
    local branch
    branch=$(timeout 2 git -C "$git_root" rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -n "$branch" ]; then
      local base_branch=""
      for candidate in main master; do
        if timeout 2 git -C "$git_root" rev-parse --verify "origin/$candidate" &>/dev/null; then
          base_branch="origin/$candidate"
          break
        fi
      done
      if [ -n "$base_branch" ]; then
        local merge_base
        merge_base=$(timeout 3 git -C "$git_root" merge-base "$base_branch" HEAD 2>/dev/null)
        if [ -n "$merge_base" ]; then
          changed=$({ timeout 5 git -C "$git_root" diff --name-only "$merge_base" 2>/dev/null
                      timeout 5 git -C "$git_root" ls-files --others --exclude-standard 2>/dev/null | head -50
                    } | sort -u | head -100)
        fi
      fi
    fi
    # Fallback to local if no merge base
    if [ -z "$changed" ]; then
      changed=$({ timeout 5 git -C "$git_root" diff --name-only 2>/dev/null
                  timeout 5 git -C "$git_root" diff --name-only --cached 2>/dev/null
                  timeout 5 git -C "$git_root" ls-files --others --exclude-standard 2>/dev/null | head -50
                } | sort -u | head -100)
    fi
  fi

  # Build set of absolute paths of changed files
  local new_set=""
  while IFS= read -r cf; do
    [ -z "$cf" ] && continue
    local abs_path="${git_root}/${cf}"
    [ -f "$abs_path" ] && new_set="${new_set}${abs_path}"$'\n'
  done <<< "$changed"
  new_set=$(echo "$new_set" | sort -u | sed '/^$/d')

  # Compare with existing tabs file
  local existing=""
  [ -f "$tabs_file" ] && existing=$(sort "$tabs_file" | sed '/^$/d')

  if [ "$new_set" != "$existing" ]; then
    echo "$new_set" > "$tabs_file"
    return 0  # changed
  fi
  return 1  # no change
}

start_watcher() {
  stop_watcher
  (
    local last_mtimes
    last_mtimes=$(_collect_mtimes)
    local git_poll_counter=0

    # Initial git sync for all watched repos
    if [ -f "$WATCHED_FILE" ] && [ -s "$WATCHED_FILE" ]; then
      local any_changed=false
      while IFS= read -r repo_root; do
        [ -z "$repo_root" ] && continue
        local rname
        rname=$(basename "$repo_root")
        local rtf
        rtf=$(_git_tabs_file "$rname")
        if _sync_repo_tabs "$repo_root" "$rtf"; then
          any_changed=true
        fi
      done < "$WATCHED_FILE"
      [ "$any_changed" = true ] && generate_tabbed_html
    fi

    while true; do
      sleep 2

      # Check file content changes across all tab files
      local cur_mtimes
      cur_mtimes=$(_collect_mtimes)
      local needs_regen=false
      if [ "$cur_mtimes" != "$last_mtimes" ]; then
        last_mtimes="$cur_mtimes"
        needs_regen=true
      fi

      # Poll git status for each watched repo every ~6s (every 3rd cycle)
      git_poll_counter=$((git_poll_counter + 1))
      if [ $git_poll_counter -ge 3 ]; then
        git_poll_counter=0
        if [ -f "$WATCHED_FILE" ] && [ -s "$WATCHED_FILE" ]; then
          while IFS= read -r repo_root; do
            [ -z "$repo_root" ] && continue
            local rname
            rname=$(basename "$repo_root")
            local rtf
            rtf=$(_git_tabs_file "$rname")
            if _sync_repo_tabs "$repo_root" "$rtf"; then
              needs_regen=true
              last_mtimes=$(_collect_mtimes)
            fi
          done < "$WATCHED_FILE"
        fi
      fi

      if [ "$needs_regen" = true ]; then
        generate_tabbed_html
      fi
    done
  ) &
  echo $! > "$WATCHER_PID"
}
