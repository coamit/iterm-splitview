# iterm-splitview

Side-by-side viewing and editing in iTerm2 — for Claude Code and terminal workflows.

[Demo](#demo) · [Features](#features) · [Install](#install) · [Quick Start](#quick-start) · [How It Works](#how-it-works) · [Claude Code Integration](#claude-code-integration) · [Changelog](#changelog)

**fileview** renders files as styled HTML in a browser split pane with multi-tab support. **fileedit** opens files in a terminal editor split pane.

<img width="1832" height="1196" alt="Screenshot 2026-03-29 at 11 27 52" src="https://github.com/user-attachments/assets/cfd50e4d-9543-43a1-88b3-f7adb774d407" />

## Demo

### fileview — Styled HTML Viewer

https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32

### fileedit — Terminal Editor

https://github.com/user-attachments/assets/ecc7991d-fb5a-4e77-8dfa-ff2a2666c683

## Features

- **fileview** — read-only styled HTML rendering (markdown, tables, reports, plans)
- **Multi-tab** — view multiple files in the same pane with browser-like tabs
- **Live auto-reload** — files update in the browser automatically when edited (via local HTTP server + XHR polling)
- **fileedit** — editable terminal editor in split pane (code, config, notes)
- **Dark/light mode** — adapts automatically to macOS system preference
- **Tables** — styled borders, dynamic column widths, hover effects
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, ERD
- **Syntax highlighting** — highlight.js with `atom-one-dark` / `atom-one-light` themes, auto-switching with system dark/light mode
- **Code files** — IDE-style rendering for `.ts`, `.js`, `.py`, `.go`, `.sh`, and [more](scripts/fileview): macOS window dots, filename header, language badge
- **Session isolation** — each iTerm tab gets its own independent split pane
- **AI integration** — Claude Code uses these tools autonomously

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/coamit/iterm-splitview/main/install.sh | bash
```

This clones the repo, symlinks scripts to `~/.local/bin/`, and optionally installs the Claude Code skill.

### Dependencies

| Dependency | Required for | Install |
|---|---|---|
| **iTerm2** | Both tools | `brew install --cask iterm2` |
| **pandoc** | fileview | `brew install pandoc` |
| **fresh** | fileedit | `brew install nickolasburr/pfa/fresh` |

> **Note:** These tools require iTerm2 — they will not work with Terminal.app. They use iTerm2's DynamicProfiles API and AppleScript automation.

## Quick Start

```bash
# View a markdown file in styled HTML split pane
fileview open README.md

# Open multiple files as tabs (last becomes active)
fileview open file1.md file2.ts file3.py

# Add a tab to existing pane (no close needed)
fileview open additional-file.md

# Remove a specific tab
fileview close file2.ts

# List current tabs (* = active)
fileview list

# Close all tabs and pane
fileview close

# Files auto-reload when edited — no manual refresh needed!
# For a clean reset (clear all tabs), use:
fileview close && fileview open README.md

# Reopen the active plan file
fileview-plan

# Edit a file in terminal editor split pane
fileedit open src/main.js

# Close the editor
fileedit close
```

## How It Works

### fileview

1. Each file is rendered (pandoc for markdown, syntax highlighting for code)
2. All open files are assembled into a single tabbed HTML page
3. A local HTTP server starts on a random port, serving the session directory
4. Creates an iTerm2 DynamicProfile pointing to `http://localhost:PORT/index.html`
5. Splits iTerm2 vertically with a browser pane on the right
6. Background watcher monitors all open files, regenerates HTML when any changes
7. Browser auto-reloads via XHR polling (~1.5s) — no manual refresh needed
8. Click tabs in the browser to switch between files

### fileedit

1. Resolves the file's absolute path
2. Creates or reuses a vertical split pane in iTerm2
3. Launches `fresh` terminal editor with the file

## Claude Code Integration

The installer automatically copies the skill to `~/.claude/skills/iterm-splitview/`. Claude Code discovers it at session start and uses fileview/fileedit proactively for rich responses and file editing.

**Manual install:**
```bash
mkdir -p ~/.claude/skills/iterm-splitview
cp claude-code/SKILL.md ~/.claude/skills/iterm-splitview/SKILL.md
```

## Changelog

### 2026-04-06 — Live Auto-Reload

- Local HTTP server per session enables real-time browser updates
- When any displayed file changes, the browser auto-reloads within ~1.5s via XHR polling
- No manual `fileview close && fileview open` needed after edits
- Server lifecycle tied to the fileview session — started on open, stopped on close

### 2026-04-05 — Multi-Tab Support

- View multiple files in the same browser split pane with clickable tabs
- New commands: `fileview open f1 f2 ...` (multi-file), `fileview close <file>` (remove tab), `fileview list`
- Tab bar with dark/light mode support, blue accent on active tab, hover effects
- Client-side tab switching with URL hash persistence across reloads
- Multi-file watcher monitors all open files and regenerates HTML when any changes
- "Updated ago" timestamp moved into the tab bar
- Backward compatible — `fileview close && fileview open <path>` still works

### 2026-04-05 — Code Block UX Improvements

- Removed line numbers from code blocks for a cleaner display
- Added top/bottom spacing around code content
- Extensionless scripts with a shebang (e.g. `#!/bin/bash`) now render as syntax-highlighted code

### 2026-04-05 — Live "Updated ago" Timestamp

- Subtle right-aligned indicator at the top of rendered files showing how long ago the content was generated (e.g., "Updated 5s ago", "Updated 2m ago")
- Ticks every second via JavaScript — helps gauge content freshness since the browser pane doesn't auto-reload
- Works for both code files and markdown/pandoc files
- Adapts to dark and light mode

### 2026-03-29 — Syntax Highlighting & Code File Rendering

- highlight.js integration with `atom-one-dark` / `atom-one-light` themes (auto-switches with system dark/light mode)
- IDE-style rendering for code files (`.ts`, `.js`, `.py`, `.go`, `.sh`, and more): macOS window dots, filename header, language badge
- Table-based code layout with hover highlights

<!-- To add a screenshot: -->
<!-- <img width="800" alt="syntax highlighting" src="https://github.com/user-attachments/assets/ASSET_ID" /> -->

### 2026-03-29 — Installer Appends Claude Instructions

- `install.sh` now appends fileview usage instructions to `~/.claude/CLAUDE.md`
- Idempotency guard — safe to re-run without duplicating content

### 2026-03-26 — Initial Release

- **fileview** — render markdown as styled HTML in a browser split pane
- **fileedit** — open files in `fresh` terminal editor in a split pane
- **fileview-plan** — shortcut to reopen the active Claude plan file
- Dark/light mode, styled tables, Mermaid diagram support
- Per-session isolation (each iTerm tab is independent)
- Claude Code skill auto-install

## License

[MIT](LICENSE)
