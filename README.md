# iterm-splitview

Side-by-side viewing and editing in iTerm2 — for Claude Code, Cursor, and terminal workflows.

**fileview** renders markdown as styled HTML in a browser split pane. **fileedit** opens files in a terminal editor split pane.

<img width="1579" height="1006" alt="image" src="https://github.com/user-attachments/assets/82cb59a0-6095-4fb8-a3e7-ae909f4f836f" />

## Demo

### fileview — Styled HTML Viewer

https://github.com/user-attachments/assets/c81b247e-81ee-43f6-ad5f-b7de4cff6e32

### fileedit — Terminal Editor

https://github.com/user-attachments/assets/ecc7991d-fb5a-4e77-8dfa-ff2a2666c683

## Features

- **fileview** — read-only styled HTML rendering (markdown, tables, reports, plans)
- **fileedit** — editable terminal editor in split pane (code, config, notes)
- **Dark/light mode** — adapts automatically to macOS system preference
- **Tables** — styled borders, dynamic column widths, hover effects
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, ERD
- **Code blocks** — syntax-friendly backgrounds
- **Session isolation** — each iTerm tab gets its own independent split pane
- **AI integration** — Claude Code and Cursor use these tools autonomously

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

# Close the viewer
fileview close

# Refresh after editing (universal pattern)
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

1. Converts markdown to HTML via pandoc with an embedded dark/light mode CSS template
2. Creates an iTerm2 DynamicProfile pointing to the rendered HTML
3. Splits iTerm2 vertically with a browser pane on the right
4. Background watcher regenerates HTML when source file changes
5. Use `fileview close && fileview open <path>` to refresh (browser doesn't auto-reload)

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

## Cursor Integration

Copy the rules file to your project root:

```bash
cp cursor/.cursorrules /path/to/project/.cursorrules
```

Or append to an existing `.cursorrules` file. Cursor will pick up the rules and use fileview/fileedit proactively.

## License

[MIT](LICENSE)
