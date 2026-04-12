#!/bin/bash
# render.sh — HTML generation for file content and tabbed pages
# shellcheck disable=SC2153  # Variables (ACTIVE_FILE etc.) are defined in config.sh

_build_diff_attrs() {
  local src_file="$1" diff_base="${2:-}"
  local added removed removed_escaped
  added=$(_get_diff_added "$src_file" "$diff_base")
  if [ -n "$added" ]; then
    printf ' data-diff-added="%s"' "$added"
  fi
  removed=$(_get_diff_removed "$src_file" "$diff_base")
  if [ -n "$removed" ] && [ "$removed" != "{}" ]; then
    removed_escaped="${removed//\'/\&#39;}"
    printf " data-diff-removed='%s'" "$removed_escaped"
  fi
}

_git_file_status() {
  local file="$1" git_root="$2"
  if git -C "$git_root" ls-files --others --exclude-standard 2>/dev/null | grep -qxF "$file"; then
    echo "new"
  elif git -C "$git_root" ls-files --deleted 2>/dev/null | grep -qxF "$file"; then
    echo "deleted"
  else
    echo "modified"
  fi
}

_build_diff_stats_html() {
  local added="$1" removed="$2" file_status="$3"
  if [ "$file_status" = "new" ]; then
    printf '<span class="diff-stats">± <span class="diff-stat-add">new</span></span>'
    return
  fi
  if [ "$file_status" = "deleted" ]; then
    printf '<span class="diff-stats">± <span class="diff-stat-rem">deleted</span></span>'
    return
  fi
  local add_count=0 rem_count=0
  if [ -n "$added" ]; then
    add_count=$(echo "$added" | tr ',' '\n' | wc -l | tr -d ' ')
  fi
  if [ -n "$removed" ] && [ "$removed" != "{}" ]; then
    rem_count=$(echo "$removed" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(len(v) for v in d.values()))" 2>/dev/null || echo 0)
  fi
  if [ "$add_count" -gt 0 ] || [ "$rem_count" -gt 0 ]; then
    printf '<span class="diff-stats">±'
    [ "$add_count" -gt 0 ] && printf '<span class="diff-stat-add">+%s</span>' "$add_count"
    [ "$rem_count" -gt 0 ] && printf '<span class="diff-stat-rem">-%s</span>' "$rem_count"
    printf '</span>'
  fi
}

_render_code_file() {
  local src_file="$1" lang="$2" diff_attrs="$3" diff_stats="$4"
  local filename lang_display
  filename=$(basename "$src_file")
  lang_display="${lang:-${src_file##*.}}"

  printf '<div class="code-file-wrapper">\n'
  printf '  <div class="code-file-header">\n'
  printf '    <span class="filename">%s</span>\n' "$filename"
  [ -n "$diff_stats" ] && printf '    %s\n' "$diff_stats"
  printf '    <span class="diff-view-mode">collapsed</span>\n'
  printf '    <span class="lang-badge">%s</span>\n' "$lang_display"
  printf '  </div>\n'
  printf '  <pre><code class="language-%s"%s>' "$lang" "$diff_attrs"
  sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g' "$src_file"
  printf '</code></pre>\n'
  printf '</div>\n'
}

generate_file_body() {
  local src_file="$1"
  local mode="${2:-}"
  local diff_base="${3:-}"

  if _is_code_file "$src_file"; then
    local lang diff_attrs="" diff_stats=""
    lang=$(_lang_from_ext "$src_file")

    if [ "$mode" = "diff" ]; then
      local added removed file_status
      added=$(_get_diff_added "$src_file" "$diff_base")
      removed=$(_get_diff_removed "$src_file" "$diff_base")
      diff_attrs=$(_build_diff_attrs "$src_file" "$diff_base")
      local git_root rel_path
      git_root=$(git -C "$(dirname "$src_file")" rev-parse --show-toplevel 2>/dev/null)
      rel_path=$(git -C "$git_root" ls-files --full-name -- "$src_file" 2>/dev/null)
      if [ -z "$rel_path" ]; then
        # Untracked file — strip git root prefix (case-insensitive for macOS)
        local lower_root lower_file
        lower_root=$(echo "$git_root" | tr '[:upper:]' '[:lower:]')
        lower_file=$(echo "$src_file" | tr '[:upper:]' '[:lower:]')
        rel_path="${lower_file#"$lower_root"/}"
      fi
      file_status=$(_git_file_status "$rel_path" "$git_root")
      diff_stats=$(_build_diff_stats_html "$added" "$removed" "$file_status")
    fi

    _render_code_file "$src_file" "$lang" "$diff_attrs" "$diff_stats"
  elif _is_text_file "$src_file"; then
    timeout 10 pandoc "$src_file" 2>/dev/null | sed '/<colgroup>/,/<\/colgroup>/d'
  else
    printf '<p style="color:#6a7080;font-style:italic">Binary file — cannot render</p>\n'
  fi
}

_show_loading() {
  touch "$_FV_SESSION_DIR/loading"
}

_all_tab_files() {
  echo "$TABS_FILE"
  if [ -f "$WATCHED_FILE" ]; then
    while IFS= read -r repo_root; do
      [ -z "$repo_root" ] && continue
      local name
      name=$(basename "$repo_root")
      local tf
      tf=$(_git_tabs_file "$name")
      [ -f "$tf" ] && echo "$tf"
    done < "$WATCHED_FILE"
  fi
}

_resolve_active_file() {
  local active_file=""
  [ -f "$ACTIVE_FILE" ] && active_file=$(cat "$ACTIVE_FILE")

  # Validate active file exists in any tab file
  local has_active=false
  while IFS= read -r tabfile; do
    [ -f "$tabfile" ] || continue
    while IFS= read -r fp; do
      [ -z "$fp" ] || [ ! -f "$fp" ] && continue
      if [ "$fp" = "$active_file" ]; then
        has_active=true
        break 2
      fi
    done < "$tabfile"
  done < <(_all_tab_files)

  if [ "$has_active" = false ]; then
    # Pick first valid file from any tab file
    while IFS= read -r tabfile; do
      [ -f "$tabfile" ] || continue
      while IFS= read -r fp; do
        [ -z "$fp" ] || [ ! -f "$fp" ] && continue
        active_file="$fp"
        break 2
      done < "$tabfile"
    done < <(_all_tab_files)
    echo "$active_file" > "$ACTIVE_FILE"
  fi
  echo "$active_file"
}

_count_valid_tabs() {
  local count=0
  while IFS= read -r tabfile; do
    [ -f "$tabfile" ] || continue
    while IFS= read -r fp; do
      [ -z "$fp" ] || [ ! -f "$fp" ] && continue
      count=$((count + 1))
    done < "$tabfile"
  done < <(_all_tab_files)
  echo "$count"
}

_tab_icon_for_file() {
  local fp="$1" mode="$2"
  local code_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>'
  local diff_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M11.93 1.25a1.75 1.75 0 0 1 2.632-.131l.014.014.136.136a1.75 1.75 0 0 1-.131 2.632l-9 7a1.75 1.75 0 0 1-.87.37l-3.16.39a.75.75 0 0 1-.83-.83l.39-3.16a1.75 1.75 0 0 1 .37-.87ZM2.25 14.5a.75.75 0 0 1 0-1.5h11.5a.75.75 0 0 1 0 1.5Z"/></svg>'

  if [ "$mode" = "diff" ] && _is_code_file "$fp"; then
    echo "$diff_icon"
  elif _is_code_file "$fp"; then
    echo "$code_icon"
  fi
}

_render_tab_group_tabs() {
  local group_id="$1" tabs_src="$2" active_file="$3" icon_mode="$4"
  local idx=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    local fname active_class="" tab_icon
    fname=$(basename "$fp")
    [ "$fp" = "$active_file" ] && active_class=" active"
    tab_icon=$(_tab_icon_for_file "$fp" "$icon_mode")
    local close_btn=""
    case "$group_id" in
      git.*) ;; # git group tabs don't get individual close buttons
      *) close_btn=$(printf '<span class="fv-tab-close" data-close-path="%s">&times;</span>' "$fp") ;;
    esac
    printf '<div class="fv-tab%s" data-tab="fv-tab-%s-%d" data-group="%s" title="%s">%s%s%s</div>\n' \
      "$active_class" "$group_id" "$idx" "$group_id" "$fp" "$tab_icon" "$fname" "$close_btn"
    idx=$((idx + 1))
  done < "$tabs_src"
}

_count_group_tabs() {
  local tabs_src="$1" count=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    count=$((count + 1))
  done < "$tabs_src"
  echo "$count"
}

_generate_tab_bar() {
  local active_file="$1" gen_epoch="$2"
  local has_files=false
  local files_count=0
  [ -f "$TABS_FILE" ] && [ -s "$TABS_FILE" ] && has_files=true && files_count=$(_count_group_tabs "$TABS_FILE")

  # Determine which group is active (based on which group contains the active file)
  local active_group="files"

  # Build list of watched repos with their tab counts
  local -a repo_names=()
  local -a repo_tab_files=()
  local -a repo_counts=()
  local has_any_git=false
  if [ -f "$WATCHED_FILE" ] && [ -s "$WATCHED_FILE" ]; then
    while IFS= read -r repo_root; do
      [ -z "$repo_root" ] && continue
      local rname
      rname=$(basename "$repo_root")
      local rtf
      rtf=$(_git_tabs_file "$rname")
      if [ -f "$rtf" ] && [ -s "$rtf" ]; then
        has_any_git=true
        repo_names+=("$rname")
        repo_tab_files+=("$rtf")
        repo_counts+=("$(_count_group_tabs "$rtf")")
        # Check if active file is in this git group
        if grep -qxF "$active_file" "$rtf" 2>/dev/null; then
          active_group="git.${rname}"
        fi
      fi
    done < "$WATCHED_FILE"
  fi

  # Group selector bar (always visible)
  printf '<div class="fv-group-bar">\n'
  local files_active=""
  [ "$active_group" = "files" ] && files_active=" active"
  printf '<span class="fv-group-sel%s" data-group="files">&#9671; Files <span class="fv-group-count">%d</span></span>\n' "$files_active" "$files_count"

  # Render a group selector for each watched repo
  local i
  for i in "${!repo_names[@]}"; do
    local rname="${repo_names[$i]}"
    local rcount="${repo_counts[$i]}"
    local group_id="git.${rname}"
    local git_active=""
    [ "$active_group" = "$group_id" ] && git_active=" active"
    printf '<span class="fv-group-sel%s" data-group="%s">&#9095; %s <span class="fv-group-count">%d</span><span class="fv-group-close" data-unwatch="%s" title="Stop watching">&times;</span></span>\n' \
      "$git_active" "$group_id" "$rname" "$rcount" "$rname"
  done

  printf '<div class="fv-tab-spacer"></div>'
  printf '<div class="fv-tab-action" id="fv-refresh" title="Refresh"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>'
  printf '</div>\n'

  # Tab bar with tabs from all groups (hidden by group via CSS/JS)
  printf '<div class="fv-tab-bar">\n'
  if [ "$has_files" = true ]; then
    _render_tab_group_tabs "files" "$TABS_FILE" "$active_file" ""
  fi
  for i in "${!repo_names[@]}"; do
    local rname="${repo_names[$i]}"
    local rtf="${repo_tab_files[$i]}"
    _render_tab_group_tabs "git.${rname}" "$rtf" "$active_file" "diff"
  done
  printf '<div class="fv-tab-spacer"></div>'
  printf '</div>\n'
  printf '<div class="fv-tab-ts" id="fv-ts" data-generated="%s"></div>\n' "$gen_epoch"
}

_generate_panels_for_group() {
  local group_id="$1" tabs_src="$2" active_file="$3" body_tmp="$4" mode="$5" diff_base="${6:-}"
  local idx=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    local active_class=""
    [ "$fp" = "$active_file" ] && active_class=" active"
    {
      printf '<div class="fv-tab-content%s" id="fv-tab-%s-%d">\n' "$active_class" "$group_id" "$idx"
      generate_file_body "$fp" "$mode" "$diff_base"
      printf '</div>\n'
    } >> "$body_tmp"
    idx=$((idx + 1))
  done < "$tabs_src"
}

_generate_tab_panels() {
  local active_file="$1" body_tmp="$2"

  # Generate panels for files group
  if [ -f "$TABS_FILE" ] && [ -s "$TABS_FILE" ]; then
    _generate_panels_for_group "files" "$TABS_FILE" "$active_file" "$body_tmp" ""
  fi

  # Generate panels for each watched repo (with diff mode, using merge-base)
  if [ -f "$WATCHED_FILE" ] && [ -s "$WATCHED_FILE" ]; then
    while IFS= read -r repo_root; do
      [ -z "$repo_root" ] && continue
      local rname rtf diff_base=""
      rname=$(basename "$repo_root")
      rtf=$(_git_tabs_file "$rname")
      if [ -f "$rtf" ] && [ -s "$rtf" ]; then
        # Compute merge base for this repo
        for candidate in main master; do
          if git -C "$repo_root" rev-parse --verify "origin/$candidate" &>/dev/null; then
            diff_base=$(git -C "$repo_root" merge-base "origin/$candidate" HEAD 2>/dev/null)
            break
          fi
        done
        _generate_panels_for_group "git.${rname}" "$rtf" "$active_file" "$body_tmp" "diff" "$diff_base"
      fi
    done < "$WATCHED_FILE"
  fi
}

generate_tabbed_html() {
  local active_file gen_epoch tab_count body_tmp saved_theme
  gen_epoch=$(date +%s)
  body_tmp=$(mktemp)
  saved_theme=""
  [ -f "$HOME/.config/fileview/theme" ] && saved_theme=$(cat "$HOME/.config/fileview/theme" 2>/dev/null)

  local has_files=false has_any_git=false
  [ -f "$TABS_FILE" ] && [ -s "$TABS_FILE" ] && has_files=true
  # Check if any watched repo has tabs
  for gtf in "$_FV_SESSION_DIR"/tabs.git.*; do
    [ -f "$gtf" ] && [ -s "$gtf" ] && { has_any_git=true; break; }
  done

  if [ "$has_files" = false ] && [ "$has_any_git" = false ]; then
    # Empty state — generate minimal page with tab bar (no tabs)
    tab_count=0
    {
      printf '<div data-fv-gen="%s" data-fv-tabs="0" data-fv-theme="%s" style="display:none"></div>\n' "$gen_epoch" "$saved_theme"
      printf '<div class="fv-tab-bar"><div class="fv-tab-spacer"></div>'
      printf '<div class="fv-tab-action" id="fv-refresh" title="Refresh"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 0 0-4.55 2.92.5.5 0 1 1-.9-.38A6 6 0 0 1 14 8a6 6 0 0 1-6 6 6 6 0 0 1-5.46-3.54.5.5 0 0 1 .92-.38A5 5 0 1 0 8 3z"/><path d="M6.5 1a.5.5 0 0 1 .5.5V5h3.5a.5.5 0 0 1 0 1H6.5a.5.5 0 0 1-.5-.5V1.5a.5.5 0 0 1 .5-.5z"/></svg></div>'
      printf '</div>\n'
      printf '<div class="fv-tab-content active" id="fv-tab-empty" style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 50px);color:#6a7080;font-size:13px;font-family:-apple-system,sans-serif">Press Ctrl+O to open a file</div>\n'
    } > "$body_tmp"
  else
    active_file=$(_resolve_active_file)
    tab_count=$(_count_valid_tabs)
    printf '<div data-fv-gen="%s" data-fv-tabs="%s" data-fv-theme="%s" style="display:none"></div>\n' "$gen_epoch" "$tab_count" "$saved_theme" > "$body_tmp"
    _generate_tab_bar "$active_file" "$gen_epoch" >> "$body_tmp"
    _generate_tab_panels "$active_file" "$body_tmp"
  fi

  # Generate inline theme CSS for instant paint
  local theme_css=""
  case "$saved_theme" in
    obsidian)  theme_css='<style id="fv-theme-inline">body{color:#cccccc;background:#1b1b1f}.fv-tab-bar{background:#151518;border-bottom-color:#2d2d33}.fv-tab{color:#6e6e7a;border-right-color:#232328}.fv-tab.active{color:#e0e0e0;background:#1b1b1f}.fv-tab.active::after{background:#a78bfa}code{background:#232327;color:#d4a051}pre{background:#1e1e22;border-color:#2d2d33}.code-file-header{background:#222226;border-bottom-color:#2d2d33;color:#6e6e7a}.code-file-header .filename{color:#cccccc}.code-file-header .lang-badge{background:#2d2d33;color:#6e6e7a}.ln{color:#4e4e58;border-right-color:#2d2d33}h1,h2,h3{color:#e0e0e0;border-bottom-color:#2d2d33}a{color:#a78bfa}strong{color:#e0e0e0}</style><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">' ;;
    evergreen) theme_css='<style id="fv-theme-inline">body{color:#c8d4cc;background:#1a2320}.fv-tab-bar{background:#141d1a;border-bottom-color:#2d4038}.fv-tab{color:#6b8275;border-right-color:#233029}.fv-tab.active{color:#e2ece6;background:#1a2320}.fv-tab.active::after{background:#6ee7b7}code{background:#243530;color:#fcd34d}pre{background:#1c2824;border-color:#2d4038}.code-file-header{background:#213029;border-bottom-color:#2d4038;color:#6b8275}.code-file-header .filename{color:#c8d4cc}.code-file-header .lang-badge{background:#2d4038;color:#6b8275}.ln{color:#4a6358;border-right-color:#2d4038}h1,h2,h3{color:#e2ece6;border-bottom-color:#2d4038}a{color:#6ee7b7}strong{color:#e2ece6}</style>' ;;
    paper)     theme_css='<style id="fv-theme-inline">body{color:#24292e;background:#ffffff}.fv-tab-bar{background:#eaecef;border-bottom-color:#d0d7de}.fv-tab{color:#6a737d;border-right-color:#d0d7de}.fv-tab.active{color:#24292e;background:#ffffff}.fv-tab.active::after{background:#0366d6}code{background:#f6f8fa;color:#c45100}pre{background:#fafafa;border-color:#d0d7de}.code-file-header{background:#f6f8fa;border-bottom-color:#d0d7de;color:#6a737d}.code-file-header .filename{color:#24292e}.code-file-header .lang-badge{background:#d0d7de;color:#6a737d}.ln{color:#bbb;border-right-color:#e1e4e8}h1,h2,h3{color:#24292e;border-bottom-color:#e1e4e8}a{color:#0366d6}strong{color:#24292e}</style><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css">' ;;
    latte)     theme_css='<style id="fv-theme-inline">body{color:#3d3929;background:#faf8f5}.fv-tab-bar{background:#efe9e0;border-bottom-color:#ddd4c4}.fv-tab{color:#8a7e6b;border-right-color:#ddd4c4}.fv-tab.active{color:#2d2517;background:#faf8f5}.fv-tab.active::after{background:#b45309}code{background:#f3ede5;color:#92400e}pre{background:#f5f0ea;border-color:#ddd4c4}.code-file-header{background:#f0ebe3;border-bottom-color:#ddd4c4;color:#8a7e6b}.code-file-header .filename{color:#3d3929}.code-file-header .lang-badge{background:#ddd4c4;color:#8a7e6b}.ln{color:#b0a48e;border-right-color:#ddd4c4}h1,h2,h3{color:#2d2517;border-bottom-color:#ddd4c4}a{color:#b45309}strong{color:#2d2517}</style><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css">' ;;
    arctic)    theme_css='<style id="fv-theme-inline">body{color:#1e3a5f;background:#f0f4f8}.fv-tab-bar{background:#dce4ed;border-bottom-color:#c5d3e0}.fv-tab{color:#5a7a9a;border-right-color:#c5d3e0}.fv-tab.active{color:#0f2440;background:#f0f4f8}.fv-tab.active::after{background:#2563eb}code{background:#e4eaf2;color:#c2410c}pre{background:#e8eef5;border-color:#c5d3e0}.code-file-header{background:#e1e8f0;border-bottom-color:#c5d3e0;color:#5a7a9a}.code-file-header .filename{color:#1e3a5f}.code-file-header .lang-badge{background:#c5d3e0;color:#5a7a9a}.ln{color:#8faabe;border-right-color:#c5d3e0}h1,h2,h3{color:#0f2440;border-bottom-color:#c5d3e0}a{color:#2563eb}strong{color:#0f2440}</style><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css">' ;;
  esac

  awk -v bodyfile="$body_tmp" -v themecss="$theme_css" '
    /\$theme_style\$/ {
      if (themecss != "") print themecss
      next
    }
    /\$body\$/ {
      while ((getline line < bodyfile) > 0) print line
      close(bodyfile)
      next
    }
    { print }
  ' "$VIEW_TEMPLATE" > "$VIEW_HTML"
  rm -f "$body_tmp" "$_FV_SESSION_DIR/loading"
}
