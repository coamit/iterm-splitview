#!/bin/bash
# render.sh — HTML generation for file content and tabbed pages
# shellcheck disable=SC2153  # Variables (ACTIVE_FILE etc.) are defined in config.sh

# Generate body HTML for a single file (output to stdout, no template wrapper)
generate_file_body() {
  local src_file="$1"
  local mode=""
  [ -f "$_FV_SESSION_DIR/mode" ] && mode=$(cat "$_FV_SESSION_DIR/mode")

  if _is_code_file "$src_file"; then
    local lang
    lang=$(_lang_from_ext "$src_file")
    local filename
    filename=$(basename "$src_file")
    local lang_display="${lang:-${src_file##*.}}"

    # Build diff data attributes if in diff mode
    local diff_attrs=""
    if [ "$mode" = "diff" ]; then
      local added
      added=$(_get_diff_added "$src_file")
      if [ -n "$added" ]; then
        diff_attrs=" data-diff-added=\"$added\""
      fi
      local removed
      removed=$(_get_diff_removed "$src_file")
      if [ -n "$removed" ] && [ "$removed" != "{}" ]; then
        # Escape for HTML attribute
        local removed_escaped
        removed_escaped="${removed//\'/\&#39;}"
        diff_attrs="$diff_attrs data-diff-removed='$removed_escaped'"
      fi
    fi

    printf '<div class="code-file-wrapper">\n'
    printf '  <div class="code-file-header">\n'
    printf '    <span class="dot dot-red"></span>\n'
    printf '    <span class="dot dot-yellow"></span>\n'
    printf '    <span class="dot dot-green"></span>\n'
    printf '    <span class="filename">%s</span>\n' "$filename"
    printf '    <span class="lang-badge">%s</span>\n' "$lang_display"
    printf '  </div>\n'
    printf '  <pre><code class="language-%s"%s>' "$lang" "$diff_attrs"
    sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g' "$src_file"
    printf '</code></pre>\n'
    printf '</div>\n'
  else
    pandoc "$src_file" 2>/dev/null | sed '/<colgroup>/,/<\/colgroup>/d'
  fi
}

_show_loading() {
  # Signal the browser-side JS to show a loading toast
  touch "$_FV_SESSION_DIR/loading"
}

# Generate the full tabbed HTML page from all files in TABS_FILE
generate_tabbed_html() {
  if [ ! -f "$TABS_FILE" ] || [ ! -s "$TABS_FILE" ]; then
    return 1
  fi

  local active_file=""
  if [ -f "$ACTIVE_FILE" ]; then
    active_file=$(cat "$ACTIVE_FILE")
  fi

  # Ensure active file is valid (exists in tabs and on disk)
  local has_active=false
  while IFS= read -r fp; do
    [ -z "$fp" ] && continue
    [ ! -f "$fp" ] && continue
    if [ "$fp" = "$active_file" ]; then
      has_active=true
      break
    fi
  done < "$TABS_FILE"
  if [ "$has_active" = false ]; then
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      [ ! -f "$fp" ] && continue
      active_file="$fp"
      break
    done < "$TABS_FILE"
    echo "$active_file" > "$ACTIVE_FILE"
  fi

  # Count valid tabs
  local tab_count=0
  while IFS= read -r fp; do
    [ -z "$fp" ] && continue
    [ ! -f "$fp" ] && continue
    tab_count=$((tab_count + 1))
  done < "$TABS_FILE"

  local gen_epoch
  gen_epoch=$(date +%s)
  local body_tmp
  body_tmp=$(mktemp)

  # Hidden marker for auto-reload
  printf '<div data-fv-gen="%s" data-fv-tabs="%s" style="display:none"></div>\n' "$gen_epoch" "$tab_count" > "$body_tmp"

  # Tab bar
  {
    printf '<div class="fv-tab-bar">\n'
    local idx=0
    while IFS= read -r fp; do
      [ -z "$fp" ] && continue
      [ ! -f "$fp" ] && continue
      local fname
      fname=$(basename "$fp")
      local active_class=""
      if [ "$fp" = "$active_file" ]; then
        active_class=" active"
      fi
      # Pick tab icon: diff mode → git icon, code file → code icon, else → doc icon
      local tab_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/></svg>'
      if [ "$mode" = "diff" ] && _is_code_file "$fp"; then
        tab_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>'
        tab_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="M11.93 1.25a1.75 1.75 0 0 1 2.632-.131l.014.014.136.136a1.75 1.75 0 0 1-.131 2.632l-9 7a1.75 1.75 0 0 1-.87.37l-3.16.39a.75.75 0 0 1-.83-.83l.39-3.16a1.75 1.75 0 0 1 .37-.87ZM2.25 14.5a.75.75 0 0 1 0-1.5h11.5a.75.75 0 0 1 0 1.5Z"/></svg>'
      elif _is_code_file "$fp"; then
        tab_icon='<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>'
      fi
      printf '<div class="fv-tab%s" data-tab="fv-tab-%d" title="%s">%s%s<span class="fv-tab-close" data-close-path="%s">&times;</span></div>\n' "$active_class" "$idx" "$fp" "$tab_icon" "$fname" "$fp"
      idx=$((idx + 1))
    done < "$TABS_FILE"
    printf '</div>\n'
    printf '<div class="fv-tab-ts" id="fv-ts" data-generated="%s"></div>\n' "$gen_epoch"
  } >> "$body_tmp"

  # Tab content panels
  idx=0
  while IFS= read -r fp; do
    [ -z "$fp" ] && continue
    [ ! -f "$fp" ] && continue
    local active_class=""
    if [ "$fp" = "$active_file" ]; then
      active_class=" active"
    fi
    {
      printf '<div class="fv-tab-content%s" id="fv-tab-%d">\n' "$active_class" "$idx"
      generate_file_body "$fp"
      printf '</div>\n'
    } >> "$body_tmp"
    idx=$((idx + 1))
  done < "$TABS_FILE"

  # Substitute body into template (awk, avoids python3 startup overhead)
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
