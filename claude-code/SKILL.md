---
name: iterm-splitview
description: >
  iTerm2 split-pane tools for viewing and editing files side-by-side.
  fileview renders markdown as styled HTML in a browser split pane.
  fileedit opens files in fresh terminal editor in a split pane.
  Use proactively for rich responses, tables, reports, and file editing.
user-invocable: false
---

# iterm-splitview

Two iTerm2 split-pane tools:
- **fileview** — renders any file as styled HTML in a browser split pane (read-only)
- **fileedit** — opens any file in `fresh` terminal editor in a split pane (editable)

## Commands

```bash
# Fileview — styled HTML viewer
fileview open <file-path>    # Render file as HTML in browser split pane
fileview close               # Close the browser split pane
fileview-plan                # Reopen the active plan file

# Fileedit — terminal editor
fileedit open <file-path>    # Open file in fresh editor in split pane
fileedit close               # Close the editor split pane
```

**Refresh pattern** (use after editing a displayed file):
```bash
fileview close && fileview open <file-path>
```

## When to Use

### fileview (use proactively)

Use **autonomously** for ANY response containing:
- Tables, multi-section content, or rich formatting
- Markdown reports, summaries, or structured data
- Plan files

**Pattern:**
1. Write content to `/tmp/claude-response-<short-descriptor>.md`
2. Display: `fileview close && fileview open <path>`
3. Keep terminal output to a **1-3 sentence summary** — the user reads the split pane

### fileedit (use proactively)

Use **autonomously** when:
- Your response involves a file the user may want to edit
- The user asks to review, inspect, or work on a specific file
- Discussing config files, source code, or notes the user might modify

## Key Rules

- **Be proactive** — don't wait for the user to ask for split pane display
- **fileview** = read-only styled HTML (markdown, tables, reports, plans)
- **fileedit** = editable terminal editor (code, config, notes)
- Both require **iTerm2** (not Terminal.app) and use per-session isolation
- Only one split pane tool at a time — close one before opening the other

## How fileview Works

1. Pandoc converts markdown to HTML using an embedded CSS template
2. Creates an iTerm2 DynamicProfile pointing to the rendered HTML
3. Splits iTerm2 vertically with a browser pane on the right
4. Background watcher regenerates HTML when source file changes
5. Browser doesn't auto-reload — use `fileview close && fileview open <path>` to refresh

## How fileedit Works

1. Resolves absolute path from input
2. Finds current iTerm session using `ITERM_SESSION_ID`
3. Creates or reuses a vertical split pane
4. Launches `fresh` editor with the file in the split pane

## Table Support

Fileview renders markdown tables with:
- Styled borders (visible grid lines in both dark/light modes)
- Dynamic column widths — each column sizes based on content
- Left-aligned text — all columns default to left alignment
- Hover effects — rows highlight on hover

Use plain separators: `|---|---|---|` — avoid alignment modifiers.

## Features

- **Dark/light mode** — adapts automatically via CSS `@media (prefers-color-scheme)`
- **Mermaid diagrams** — loaded from CDN, renders in both themes
- **Code blocks** — syntax-friendly backgrounds
- **Session isolation** — each iTerm tab gets its own independent split pane

## Dependencies

| Dependency | Required for | Install |
|---|---|---|
| iTerm2 | Both tools | `brew install --cask iterm2` |
| pandoc | fileview | `brew install pandoc` |
| fresh | fileedit | `brew install nickolasburr/pfa/fresh` |

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/coamit/iterm-splitview/main/install.sh | bash
```

Or manually symlink scripts to PATH:
```bash
ln -sf <repo-path>/scripts/fileview ~/.local/bin/fileview
ln -sf <repo-path>/scripts/fileview-plan ~/.local/bin/fileview-plan
ln -sf <repo-path>/scripts/fileedit ~/.local/bin/fileedit
```
