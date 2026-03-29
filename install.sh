#!/bin/bash
# install.sh — Install iterm-splitview (fileview + fileedit)
set -e

REPO_URL="https://github.com/coamit/iterm-splitview.git"
INSTALL_DIR="$HOME/.local/share/iterm-splitview"
BIN_DIR="$HOME/.local/bin"
SKILL_DIR="$HOME/.claude/skills/iterm-splitview"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"

echo "==> Installing iterm-splitview..."

# 0. Migrate from old iterm-fileview plugin (agentic-builders-hub)
OLD_SKILL_DIR="$HOME/.claude/skills/iterm-fileview"
OLD_CLAUDE_MARKER="# iterm-fileview Plugin — Claude Instructions"
MIGRATED=false

if [ -d "$OLD_SKILL_DIR" ]; then
  rm -rf "$OLD_SKILL_DIR"
  echo "    Migrated: removed old skill directory ($OLD_SKILL_DIR)"
  MIGRATED=true
fi

if [ -f "$CLAUDE_MD" ] && grep -qF "$OLD_CLAUDE_MARKER" "$CLAUDE_MD" 2>/dev/null; then
  # Remove old block: from marker to the next top-level heading (# ) or EOF
  python3 -c '
import re, sys
text = open(sys.argv[1]).read()
marker = sys.argv[2]
pattern = r"\n*" + re.escape(marker) + r".*?(?=\n# |\Z)"
text = re.sub(pattern, "", text, flags=re.DOTALL)
text = text.rstrip("\n") + "\n"
open(sys.argv[1], "w").write(text)
' "$CLAUDE_MD" "$OLD_CLAUDE_MARKER"
  echo "    Migrated: removed old iterm-fileview block from $CLAUDE_MD"
  MIGRATED=true
fi

if [ "$MIGRATED" = true ]; then
  echo "    Migration from iterm-fileview plugin complete."
fi

# 1. Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "    Updating existing installation..."
  git -C "$INSTALL_DIR" pull --quiet
else
  echo "    Cloning repository..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi

# 2. Symlink scripts
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/scripts/fileview" "$BIN_DIR/fileview"
ln -sf "$INSTALL_DIR/scripts/fileview-plan" "$BIN_DIR/fileview-plan"
ln -sf "$INSTALL_DIR/scripts/fileedit" "$BIN_DIR/fileedit"
echo "    Symlinked: fileview, fileview-plan, fileedit → $BIN_DIR/"

# 3. Ensure ~/.local/bin is on PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  SHELL_RC=""
  if [ -n "$ZSH_VERSION" ] || [ "$(basename "$SHELL")" = "zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -n "$BASH_VERSION" ] || [ "$(basename "$SHELL")" = "bash" ]; then
    SHELL_RC="$HOME/.bash_profile"
  fi

  if [ -n "$SHELL_RC" ]; then
    if ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
      echo "    Added ~/.local/bin to PATH in $SHELL_RC"
    fi
  fi
  export PATH="$BIN_DIR:$PATH"
fi

# 4. Install Claude Code skill (if ~/.claude exists)
if [ -d "$HOME/.claude" ]; then
  mkdir -p "$SKILL_DIR"
  cp "$INSTALL_DIR/claude-code/SKILL.md" "$SKILL_DIR/SKILL.md"
  echo "    Installed Claude Code skill → $SKILL_DIR/"
fi

# 5. Append Claude instructions to global CLAUDE.md (if ~/.claude exists)
MARKER="# iterm-splitview — Claude Instructions"

if [ -d "$HOME/.claude" ]; then
  if ! grep -qF "$MARKER" "$CLAUDE_MD" 2>/dev/null; then
    echo "" >> "$CLAUDE_MD"
    cat "$INSTALL_DIR/CLAUDE.md" >> "$CLAUDE_MD"
    echo "    Appended Claude instructions → $CLAUDE_MD"
  else
    echo "    Claude instructions already present in $CLAUDE_MD"
  fi
fi

# 6. Check dependencies
echo ""
echo "==> Checking dependencies..."
MISSING=""

if ! command -v pandoc &>/dev/null; then
  MISSING="${MISSING}    brew install pandoc          (required for fileview)\n"
fi

if ! command -v fresh &>/dev/null; then
  MISSING="${MISSING}    brew install nickolasburr/pfa/fresh  (required for fileedit)\n"
fi

if [ -z "$ITERM_SESSION_ID" ]; then
  echo "    ⚠ Not running in iTerm2 — these tools require iTerm2"
fi

if [ -n "$MISSING" ]; then
  echo "    Missing dependencies:"
  echo -e "$MISSING"
else
  echo "    All dependencies found."
fi

# 7. Done
echo ""
echo "==> Installation complete!"
echo ""
echo "    Verify:"
echo "      which fileview     # → $BIN_DIR/fileview"
echo "      which fileedit     # → $BIN_DIR/fileedit"
echo ""
echo "    Quick start:"
echo "      fileview open /path/to/file.md    # View in browser split pane"
echo "      fileedit open /path/to/file.js    # Edit in terminal split pane"
echo ""
echo "    If you just added ~/.local/bin to PATH, restart your shell or run:"
echo "      source ~/.zshrc"
