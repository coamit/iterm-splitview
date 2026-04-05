---
name: iterm-splitview
description: >
  iTerm2 split-pane tools for viewing and editing files side-by-side.
  fileview renders files as styled HTML in a browser split pane with multi-tab support.
  fileedit opens files in fresh terminal editor in a split pane.
  Use proactively for rich responses, tables, reports, and file editing.
user-invocable: false
---

# iterm-splitview

Two iTerm2 split-pane tools:
- **fileview** — renders files as styled HTML in a browser split pane with tabs (read-only)
- **fileedit** — opens any file in `fresh` terminal editor in a split pane (editable)

## Commands

```bash
# Fileview — styled HTML viewer with tabs
fileview open <file> [file2] ...  # Add file(s) as tabs, open/reuse browser pane
fileview close                    # Close pane + clear all tabs
fileview close <file>             # Remove a specific tab
fileview refresh                  # Regenerate HTML for all tabs
fileview list                     # List current tabs (* = active)
fileview-plan                     # Reopen the active plan file

# Fileedit — terminal editor
fileedit open <file-path>    # Open file in fresh editor in split pane
fileedit close               # Close the editor split pane
```

**Refresh pattern** (use after editing a displayed file):
```bash
fileview close && fileview open <file-path>
```

**Multi-tab patterns:**
```bash
# Open multiple files at once (last becomes active)
fileview open file1.md file2.ts file3.py

# Add a tab to existing pane (no close needed)
fileview open additional-file.md

# Remove a specific tab without closing pane
fileview close file2.ts
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
- **Duplicate prevention** — opening a file already in tabs just activates it
- **Auto-reload** — browser polls for HTML changes and reloads automatically

## How fileview Works

1. Each file is rendered (pandoc for markdown, syntax highlighting for code)
2. All open files are assembled into a single tabbed HTML page
3. Creates an iTerm2 DynamicProfile pointing to the rendered HTML
4. Splits iTerm2 vertically with a browser pane on the right
5. Background watcher monitors ALL open files, regenerates HTML when any changes
6. Browser auto-reloads when it detects the HTML was regenerated

## How fileedit Works

1. Resolves absolute path from input
2. Finds current iTerm session using `ITERM_SESSION_ID`
3. Creates or reuses a vertical split pane
4. Launches `fresh` editor with the file in the split pane

## Tab Behavior

- **Tab bar** — always visible at the top with clickable tabs
- **Active tab** — highlighted with blue accent line, last opened file is active
- **Tab switching** — click tabs in the browser to switch; URL hash preserves selection across reloads
- **Adding tabs** — `fileview open <file>` adds to existing pane without closing
- **Removing tabs** — `fileview close <file>` removes one tab; closes pane if last
- **Close all** — `fileview close` (no args) clears everything

## Table Support

Fileview renders markdown tables with:
- Styled borders (visible grid lines in both dark/light modes)
- Dynamic column widths — each column sizes based on content
- Left-aligned text — all columns default to left alignment
- Hover effects — rows highlight on hover

Use plain separators: `|---|---|---|` — avoid alignment modifiers.

## Features

- **Multi-tab** — view multiple files in the same pane with browser-like tabs
- **Auto-reload** — browser detects HTML regeneration and reloads automatically
- **Dark/light mode** — adapts automatically via CSS `@media (prefers-color-scheme)`
- **Mermaid diagrams** — loaded from CDN, renders in both themes
- **Code blocks** — syntax-friendly backgrounds with line numbers
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
