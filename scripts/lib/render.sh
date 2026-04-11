#!/bin/bash
# render.sh — HTML generation for file content and tabbed pages
# shellcheck disable=SC2153  # Variables (ACTIVE_FILE etc.) are defined in config.sh

_build_diff_attrs() {
  local src_file="$1"
  local added removed removed_escaped
  added=$(_get_diff_added "$src_file")
  if [ -n "$added" ]; then
    printf ' data-diff-added="%s"' "$added"
  fi
  removed=$(_get_diff_removed "$src_file")
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
    printf '<span class="diff-stats"><span class="diff-stat-add">new</span></span>'
    return
  fi
  if [ "$file_status" = "deleted" ]; then
    printf '<span class="diff-stats"><span class="diff-stat-rem">deleted</span></span>'
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
  local mode=""
  [ -f "$_FV_SESSION_DIR/mode" ] && mode=$(cat "$_FV_SESSION_DIR/mode")

  if _is_code_file "$src_file"; then
    local lang diff_attrs="" diff_stats=""
    lang=$(_lang_from_ext "$src_file")

    if [ "$mode" = "diff" ]; then
      local added removed file_status
      added=$(_get_diff_added "$src_file")
      removed=$(_get_diff_removed "$src_file")
      diff_attrs=$(_build_diff_attrs "$src_file")
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
  else
    pandoc "$src_file" 2>/dev/null | sed '/<colgroup>/,/<\/colgroup>/d'
  fi
}

_show_loading() {
  touch "$_FV_SESSION_DIR/loading"
}

_resolve_active_file() {
  local active_file=""
  [ -f "$ACTIVE_FILE" ] && active_file=$(cat "$ACTIVE_FILE")

  # Validate active file exists in tabs
  local has_active=false
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    if [ "$fp" = "$active_file" ]; then
      has_active=true
      break
    fi
  done < "$TABS_FILE"

  if [ "$has_active" = false ]; then
    while IFS= read -r fp; do
      [ -z "$fp" ] || [ ! -f "$fp" ] && continue
      active_file="$fp"
      break
    done < "$TABS_FILE"
    echo "$active_file" > "$ACTIVE_FILE"
  fi
  echo "$active_file"
}

_count_valid_tabs() {
  local count=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    count=$((count + 1))
  done < "$TABS_FILE"
  echo "$count"
}

_tab_icon_for_file() {
  local fp="$1" mode="$2"
  local doc_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/></svg>'
  local code_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>'
  local diff_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M11.93 1.25a1.75 1.75 0 0 1 2.632-.131l.014.014.136.136a1.75 1.75 0 0 1-.131 2.632l-9 7a1.75 1.75 0 0 1-.87.37l-3.16.39a.75.75 0 0 1-.83-.83l.39-3.16a1.75 1.75 0 0 1 .37-.87ZM2.25 14.5a.75.75 0 0 1 0-1.5h11.5a.75.75 0 0 1 0 1.5Z"/></svg>'

  if [ "$mode" = "diff" ] && _is_code_file "$fp"; then
    echo "$diff_icon"
  elif _is_code_file "$fp"; then
    echo "$code_icon"
  else
    echo "$doc_icon"
  fi
}

_generate_tab_bar() {
  local active_file="$1" gen_epoch="$2"
  local mode=""
  [ -f "$_FV_SESSION_DIR/mode" ] && mode=$(cat "$_FV_SESSION_DIR/mode")

  printf '<div class="fv-tab-bar">\n'
  local idx=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    local fname active_class="" tab_icon
    fname=$(basename "$fp")
    [ "$fp" = "$active_file" ] && active_class=" active"
    tab_icon=$(_tab_icon_for_file "$fp" "$mode")
    printf '<div class="fv-tab%s" data-tab="fv-tab-%d" title="%s">%s%s<span class="fv-tab-close" data-close-path="%s">&times;</span></div>\n' "$active_class" "$idx" "$fp" "$tab_icon" "$fname" "$fp"
    idx=$((idx + 1))
  done < "$TABS_FILE"
  printf '</div>\n'
  printf '<div class="fv-tab-ts" id="fv-ts" data-generated="%s"></div>\n' "$gen_epoch"
}

_generate_tab_panels() {
  local active_file="$1" body_tmp="$2"
  local idx=0
  while IFS= read -r fp; do
    [ -z "$fp" ] || [ ! -f "$fp" ] && continue
    local active_class=""
    [ "$fp" = "$active_file" ] && active_class=" active"
    {
      printf '<div class="fv-tab-content%s" id="fv-tab-%d">\n' "$active_class" "$idx"
      generate_file_body "$fp"
      printf '</div>\n'
    } >> "$body_tmp"
    idx=$((idx + 1))
  done < "$TABS_FILE"
}

generate_tabbed_html() {
  if [ ! -f "$TABS_FILE" ] || [ ! -s "$TABS_FILE" ]; then
    return 1
  fi

  local active_file gen_epoch tab_count body_tmp
  active_file=$(_resolve_active_file)
  tab_count=$(_count_valid_tabs)
  gen_epoch=$(date +%s)
  body_tmp=$(mktemp)

  printf '<div data-fv-gen="%s" data-fv-tabs="%s" style="display:none"></div>\n' "$gen_epoch" "$tab_count" > "$body_tmp"
  _generate_tab_bar "$active_file" "$gen_epoch" >> "$body_tmp"
  _generate_tab_panels "$active_file" "$body_tmp"

  awk -v bodyfile="$body_tmp" '
    /\$body\$/ {
      while ((getline line < bodyfile) > 0) print line
      close(bodyfile)
      next
    }
    { print }
  ' "$VIEW_TEMPLATE" > "$VIEW_HTML"
  rm -f "$body_tmp" "$_FV_SESSION_DIR/loading"
}
