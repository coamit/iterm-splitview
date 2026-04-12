#!/bin/bash
# diff.sh — Git diff computation for change highlighting

# Get comma-separated list of added/modified line numbers from git diff
_get_diff_added() {
  local file="$1" base="${2:-}"
  local diff_cmd=(git diff --unified=0)
  [ -n "$base" ] && diff_cmd+=("$base")
  diff_cmd+=(-- "$file")
  "${diff_cmd[@]}" 2>/dev/null | \
    grep -oE '^\@\@ [^ ]+ \+[0-9]+(,[0-9]+)?' | \
    sed -E 's/.*\+([0-9]+)(,([0-9]+))?/\1 \3/' | \
    while read -r s c; do
      c=${c:-1}
      for ((i=0; i<c; i++)); do echo $((s+i)); done
    done | paste -sd, -
}

# Get JSON map of removed lines: {"afterLineIdx": ["escaped content", ...]}
_get_diff_removed() {
  local file="$1" base="${2:-}"
  local diff_output
  local diff_cmd=(git diff)
  [ -n "$base" ] && diff_cmd+=("$base")
  diff_cmd+=(-- "$file")
  diff_output=$("${diff_cmd[@]}" 2>/dev/null)
  [ -z "$diff_output" ] && return

  # Parse unified diff to extract removed lines with their position
  # shellcheck disable=SC2259  # pipe provides data, heredoc provides script
  echo "$diff_output" | python3 - << 'PYEOF'
import sys, json, re
new_line = 0
result = {}
for line in sys.stdin:
    line = line.rstrip('\n')
    if line.startswith('@@'):
        m = re.search(r'\+(\d+)', line)
        if m: new_line = int(m.group(1))
    elif line.startswith('-') and not line.startswith('---'):
        content = line[1:]
        content = content.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
        key = str(new_line - 1)
        if key not in result: result[key] = []
        result[key].append(content)
    elif line.startswith('+') and not line.startswith('+++'):
        new_line += 1
    elif line.startswith(' '):
        new_line += 1
print(json.dumps(result))
PYEOF
}
