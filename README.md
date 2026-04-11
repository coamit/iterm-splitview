# iterm-splitview

Side-by-side viewing and editing in iTerm2 — for Claude Code and terminal workflows.

[Demo](#demo) · [Features](#features) · [Install](#install) · [Quick Start](#quick-start) · [How It Works](#how-it-works) · [Claude Code Integration](#claude-code-integration) · [Changelog](#changelog)

**fileview** renders markdown as styled HTML in a browser split pane. **fileedit** opens files in a terminal editor split pane.

## Demo

### fileview — Styled HTML Viewer

[https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32](https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32)

### fileedit — Terminal Editor

[https://github.com/user-attachments/assets/ecc7991d-fb5a-4e77-8dfa-ff2a2666c683](https://github.com/user-attachments/assets/ecc7991d-fb5a-4e77-8dfa-ff2a2666c683)

## Features

- **fileview** — read-only styled HTML rendering (markdown, tables, reports, plans) 
- **fileedit** — editable terminal editor in split pane (code, config, notes)
- **Multi-tab** — open multiple files as tabs in the same pane, close individual tabs
- **Filesystem search** — Ctrl+O to find and open files, Ctrl+H to grep text and open matches (powered by rg + fzf)
- **Search modal** — Ctrl+P for tab search, Ctrl+F/G for text search in current/all tabs with fuzzy matching
- **Diff viewer** — `fileview diff` shows git changes with add/remove highlighting and hunk navigation
- **6 themes** — Midnight, Obsidian, Evergreen (dark) and Paper, Latte, Arctic (light) — Ctrl+. to switch
- **Tables** — styled borders, dynamic column widths, hover effects
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, ERD
- **Syntax highlighting** — highlight.js with `atom-one-dark` / `atom-one-light` themes, auto-switching with system dark/light mode
- **Code files** — IDE-style rendering for `.ts`, `.js`, `.py`, `.go`, `.sh`, and [more](scripts/fileview): macOS window dots, filename header, language badge, and line numbers
- **Live auto-reload** — built-in HTTP server watches files and reloads the browser automatically
- **Session isolation** — each iTerm tab gets its own independent split pane
- **AI integration** — Claude Code uses these tools autonomously

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/coamit/iterm-splitview/main/install.sh | bash
```

This clones the repo to `~/.local/share/iterm-splitview/`, symlinks scripts to `~/.local/bin/`, and optionally installs the Claude Code skill. If run from a local checkout, it symlinks directly to that repo instead of cloning.

### Dependencies


| Dependency | Required for | Install                               |
| ---------- | ------------ | ------------------------------------- |
| **iTerm2** | Both tools   | `brew install --cask iterm2`          |
| **pandoc** | fileview     | `brew install pandoc`                 |
| **fresh**  | fileedit     | `brew install nickolasburr/pfa/fresh` |


> **Note:** These tools require iTerm2 — they will not work with Terminal.app. They use iTerm2's DynamicProfiles API and AppleScript automation.

## Quick Start

```bash
# View a file in styled HTML split pane
fileview open README.md

# Open multiple files as tabs
fileview open file1.md file2.ts file3.py

# Add a tab to existing pane
fileview open another-file.md

# Close a specific tab
fileview close file1.md

# Close pane and all tabs
fileview close

# View git diff with change highlighting
fileview diff

# List open tabs
fileview list

# Reopen the active plan file
fileview-plan

# Edit a file in terminal editor split pane
fileedit open src/main.js

# Close the editor
fileedit close
```

**Keyboard shortcuts** (in the browser pane):

| Key | Action |
|-----|--------|
| `Ctrl+O` | Open file by name (fuzzy filesystem search) |
| `Ctrl+H` | Search text and open file (grep filesystem) |
| `Ctrl+F` | Find text in current tab |
| `Ctrl+G` | Find text in all open tabs |
| `Ctrl+P` | Find tab by name |
| `Ctrl+T` / `Ctrl+B` | Scroll to top / bottom |
| `Ctrl+D` | Jump to next diff |
| `Ctrl+X` | Toggle collapsed/expanded diff |
| `Ctrl+C` | Copy file path |
| `Ctrl+J` | Open file in Cursor |
| `Ctrl+K` | Open workspace in Cursor |
| `Ctrl+.` | Settings (theme picker) |
| `Ctrl+]` / `Ctrl+[` | Next / previous tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+/` | Show all shortcuts |

## How It Works

### fileview

1. Converts files to HTML via pandoc (markdown) or highlight.js (code) with an embedded dark/light mode template
2. Starts a local HTTP server and creates an iTerm2 DynamicProfile pointing to it
3. Splits iTerm2 vertically with a browser pane on the right
4. Background watcher detects file changes and regenerates HTML — browser auto-reloads

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

### 2026-04-11 — Filesystem Search, Themes & Enhanced Shortcuts

- **Filesystem search** — Ctrl+O opens files by name (fuzzy, via `rg --files | fzf --filter`), Ctrl+H searches text across files (via `rg`) and opens matches
- **Theme system** — Ctrl+. opens settings with 6 themes: Midnight, Obsidian, Evergreen (dark) and Paper, Latte, Arctic (light); persisted to `~/.config/fileview/theme`
- **Instant loading tabs** — selecting a file creates a placeholder tab immediately with a centered spinner; content appears after render
- **Configurable search root** — defaults to git root of active file; changeable via CLI (`fileview search-root`) or clicking the path in the modal
- **New shortcuts** — Ctrl+T/B (scroll top/bottom), Ctrl+K (open workspace in Cursor), Ctrl+J/K show toast banners
- **Fuzzy matching** — all client-side search modals use fuzzy match with per-character highlighting
- **Markdown search** — Ctrl+F/G now searches headers, paragraphs, and other rendered markdown content
- **Empty pane** — `fileview open` with no args opens an empty pane with "Press Ctrl+O to open a file"
- **Searchable shortcuts** — Ctrl+/ modal now has a filter input
- **Refresh button** — sticky button in tab bar triggers page regeneration
- **Anti-flicker** — tab content hidden until JS init completes; auto-reload debounced for rapid open/close
- **Threaded server** — HTTP server uses `ThreadingMixIn` for non-blocking search
- **Aliases** — `fv` (fileview open), `fvp` (fileview-plan)
- **Security** — HTML escaping for filenames, localhost-only binding, input validation, line length caps

### 2026-04-10 — Keyboard Shortcuts, Collapsed Diff, Line Numbers & UI Polish

- **New shortcuts** — Ctrl+D (next diff), Ctrl+G (search active file), Ctrl+C (copy path), Ctrl+J (open in Cursor), Ctrl+X (toggle collapsed/expanded diff), Ctrl+/ (show shortcuts)
- **Collapsed diff mode** — diff files open collapsed by default, showing only changes with 3 lines of context and dotted separators between sections; Ctrl+X toggles per tab
- **Diff stats in file header** — `± +N -N` for modified files, `± new` / `± deleted` for untracked/deleted files
- **Sticky diff counter** — shows current hunk position (e.g. "1/3") when navigating with Ctrl+D, dismisses on click/keypress
- **Line numbers** — code files show line numbers (original numbers preserved in collapsed view); unselectable via CSS `::before` so copy-paste only grabs code
- **Persistent search highlight** — text search results stay highlighted in yellow until click or keypress
- **Collapsed indicator** — yellow "COLLAPSED" badge in file header when in collapsed mode
- **Modal scrollbar** — visible thin scrollbar when results overflow
- **Codebase refactoring** — extracted long methods and complex conditionals across all files

### 2026-04-11 — Multi-Tab, Search Modal, Diff Navigation & Installer Update

- **Multi-tab support** — open multiple files as tabs in the same pane (`fileview open f1 f2 f3`), close individual tabs, tab bar with scroll
- **Search modal** — Ctrl+P to search/filter files by name, Ctrl+F to search text content across all open files with match highlighting
- **Diff navigation** — arrow buttons to jump between diff hunks, no auto-jump on load (user controls navigation)
- **Keyboard shortcuts** — Ctrl+]/[ to cycle tabs, Ctrl+W to close active tab
- **Built-in HTTP server** — auto-reload on file changes (no manual refresh needed)
- **Template caching** — faster opens by reusing the HTML template
- **Installer improvements** — detects local repo checkout and symlinks directly (no redundant clone); cleans up old `~/.local/share` clone; migrates from old `iterm-fileview` plugin

### 2026-03-29 — Syntax Highlighting & Code File Rendering

- highlight.js integration with `atom-one-dark` / `atom-one-light` themes (auto-switches with system dark/light mode)
- IDE-style rendering for code files (`.ts`, `.js`, `.py`, `.go`, `.sh`, and more): macOS window dots, filename header, language badge
- Custom line numbers with table-based layout

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