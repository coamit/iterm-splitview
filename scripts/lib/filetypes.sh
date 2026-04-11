#!/bin/bash
# filetypes.sh — File type detection and language mapping

_is_code_file() {
  local ext="${1##*.}"
  case "$ext" in
    ts|tsx|js|jsx|mjs|cjs|\
    py|rb|go|rs|java|kt|swift|\
    c|cc|cpp|h|hpp|\
    cs|fs|fsx|\
    sh|bash|zsh|\
    yaml|yml|toml|json|jsonc|\
    sql|graphql|gql|\
    html|css|scss|sass|less|\
    lua|php|r|m|ex|exs|\
    tf|hcl|dockerfile|makefile|\
    vue|svelte)
      return 0 ;;
    *)
      local basename
      basename=$(basename "$1")
      case "$basename" in
        Dockerfile|Makefile|Vagrantfile|Procfile|Brewfile) return 0 ;;
      esac
      # Check for shebang in extensionless files
      if [ -f "$1" ]; then
        local first_line
        first_line=$(head -1 "$1" 2>/dev/null)
        case "$first_line" in
          '#!'*) return 0 ;;
        esac
      fi
      return 1 ;;
  esac
}

_lang_from_ext() {
  local ext="${1##*.}"
  local base
  base=$(basename "$1")
  case "$ext" in
    ts|tsx)       echo "typescript" ;;
    js|jsx|mjs|cjs) echo "javascript" ;;
    py)           echo "python" ;;
    rb)           echo "ruby" ;;
    go)           echo "go" ;;
    rs)           echo "rust" ;;
    java)         echo "java" ;;
    kt)           echo "kotlin" ;;
    swift)        echo "swift" ;;
    c|h)          echo "c" ;;
    cc|cpp|hpp)   echo "cpp" ;;
    cs)           echo "csharp" ;;
    sh|bash|zsh)  echo "bash" ;;
    yaml|yml)     echo "yaml" ;;
    toml)         echo "toml" ;;
    json|jsonc)   echo "json" ;;
    sql)          echo "sql" ;;
    graphql|gql)  echo "graphql" ;;
    html)         echo "html" ;;
    css)          echo "css" ;;
    scss|sass)    echo "scss" ;;
    lua)          echo "lua" ;;
    php)          echo "php" ;;
    r)            echo "r" ;;
    ex|exs)       echo "elixir" ;;
    tf|hcl)       echo "hcl" ;;
    vue)          echo "xml" ;;
    svelte)       echo "xml" ;;
    *)
      case "$base" in
        Dockerfile) echo "dockerfile" ;;
        Makefile)   echo "makefile" ;;
        *)
          # Detect language from shebang
          if [ -f "$1" ]; then
            local shebang
            shebang=$(head -1 "$1" 2>/dev/null)
            case "$shebang" in
              *bash*|*'/bin/sh'*) echo "bash" ;;
              *zsh*)   echo "bash" ;;
              *python*) echo "python" ;;
              *ruby*)  echo "ruby" ;;
              *node*)  echo "javascript" ;;
              *perl*)  echo "perl" ;;
              *)       echo "" ;;
            esac
          else
            echo ""
          fi ;;
      esac ;;
  esac
}
