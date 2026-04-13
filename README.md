# iterm-splitview

A lightweight read-only IDE in your terminal split pane — view files, browse code, track git changes, and search your codebase without leaving iTerm2.

[Demo](#demo) · [Why](#why) · [Install](#install) · [Usage](#usage) · [Changelog](#changelog)

## Demo

### Code viewer with syntax highlighting and git diff

[https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32](https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32)

## Why

You're working in the terminal. You want to see a file, check a diff, or read a markdown doc — but you don't want to leave your workflow, open a full IDE, or lose your scroll position.

**iterm-splitview** gives you a browser pane right next to your terminal:

- **View any file** with syntax highlighting, line numbers, and themes
- **Track git changes** across multiple repos with live diff highlighting
- **Search your codebase** with fuzzy file search and text grep
- **Zero context switching** — everything runs inside iTerm2

It's not an editor. It's the reading half of an IDE, designed for terminal-first developers.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/coamit/iterm-splitview/main/install.sh | bash
```

Requires **iTerm2** (`brew install --cask iterm2`) and **pandoc** (`brew install pandoc`).

## Usage

### View files

```bash
fileview open README.md                    # Open a file
fileview open src/app.ts lib/utils.ts      # Open multiple files as tabs
fileview close lib/utils.ts                # Close a tab
fileview close                             # Close everything
```

### Track git changes

```bash
fileview diff                              # Watch current repo for changes
fileview diff ~/dev/frontend ~/dev/api     # Watch multiple repos at once
fileview unwatch                           # Stop watching
```

Changed files appear in a separate group with diff highlighting — added lines in green, removed in red, collapsed by default with 3 lines of context.

### Search

| Shortcut | What it does |
|----------|-------------|
| `Ctrl+O` | Find and open a file (fuzzy search) |
| `Ctrl+H` | Search text across files and open matches |
| `Ctrl+F` | Find text in current tab |
| `Ctrl+G` | Find text in all open tabs |
| `Ctrl+P` | Jump to an open tab by name |

### Navigate

| Shortcut | What it does |
|----------|-------------|
| `Ctrl+]` / `Ctrl+[` | Next / previous tab |
| `Ctrl+D` | Jump to next diff hunk |
| `Ctrl+X` | Toggle collapsed / expanded diff |
| `Ctrl+W` | Close active tab |
| `Ctrl+/` | Show all shortcuts |

### Themes

6 built-in themes (3 dark, 3 light). Open settings with `Ctrl+/` and pick one. Your choice persists across sessions.

## How it works

1. Renders files as styled HTML via pandoc (markdown) or highlight.js (code)
2. Starts a local HTTP server in the background
3. Opens a browser pane in iTerm2 next to your terminal
4. Watches files for changes and swaps content in-place (no page reload, no flicker)

Each iTerm tab gets its own isolated session — multiple fileview instances don't interfere.

## Claude Code integration

If you use [Claude Code](https://claude.com/claude-code), the installer adds a skill so Claude uses fileview autonomously for rich responses, plans, and code review.

```bash
# Manual install
mkdir -p ~/.claude/skills/iterm-splitview
cp claude-code/SKILL.md ~/.claude/skills/iterm-splitview/SKILL.md
```

## Changelog

<details>
<summary><strong>2026-04-13</strong> — Modular JS, linting, tests, CI</summary>

- Split 2100-line inline JS into 11 focused modules
- ESLint + ShellCheck automated quality checks
- 23 JS unit tests + 13 CLI integration tests
- GitHub Actions CI — blocks merge on failure
- CONTRIBUTING.md + AGENTS.md coding guidelines

</details>

<details>
<summary><strong>2026-04-12</strong> — In-place content swap, multi-repo watch</summary>

- Replaced `location.reload()` with in-place DOM swapping — no more blank page flashes
- Loading tab with spinner when opening files
- Multi-arg support: `fileview close f1 f2 f3`, `fileview diff r1 r2`
- Per-group tab memory when switching between file/git groups
- Thread-safe concurrent file operations

</details>

<details>
<summary><strong>2026-04-11</strong> — Filesystem search, themes, multi-tab</summary>

- Ctrl+O/H filesystem search powered by ripgrep + fzf
- 6 themes: Midnight, Obsidian, Evergreen, Paper, Latte, Arctic
- Multi-tab support with tab bar
- Fuzzy matching in all search modals
- Built-in HTTP server with live auto-reload

</details>

<details>
<summary><strong>2026-04-10</strong> — Diff viewer, keyboard shortcuts</summary>

- Collapsed diff mode with context lines and hunk navigation
- Diff stats in file headers (+N/-N)
- Line numbers for code files
- Keyboard shortcuts: Ctrl+D, Ctrl+X, Ctrl+C, Ctrl+J, Ctrl+/

</details>

<details>
<summary><strong>2026-03-29</strong> — Syntax highlighting</summary>

- highlight.js with atom-one-dark/light themes
- IDE-style code rendering: filename header, language badge, line numbers

</details>

<details>
<summary><strong>2026-03-26</strong> — Initial release</summary>

- fileview: styled HTML rendering in browser split pane
- fileedit: terminal editor in split pane
- Dark/light mode, tables, Mermaid diagrams
- Per-session isolation, Claude Code skill

</details>

## License

[MIT](LICENSE)
