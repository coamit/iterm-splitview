# Core Viewer + Syntax Highlighting

## Overview

Initial release of iterm-splitview. Two CLI tools: `fileview` renders files as styled HTML in a read-only iTerm2 browser split pane, `fileedit` opens a terminal editor (`fresh`) in a split pane. Added syntax highlighting via highlight.js and pandoc-based markdown rendering.

## Implementation Summary

- `fileview open/close/list` CLI commands for managing the browser split pane
- pandoc converts markdown to HTML; highlight.js provides syntax highlighting for code files
- Dark and light mode support based on iTerm2 profile detection
- Per-session isolation via temp files in `/tmp/fileview-<session-id>/`
- AppleScript controls iTerm2 pane creation and management
- Claude Code skill auto-install via `install.sh` (appends instructions to `~/.claude/CLAUDE.md`)
- `fileview-plan` shortcut for reopening the active plan file

## Key Files

- `scripts/fileview` — CLI entry point, command dispatch
- `scripts/fileedit` — Terminal editor split pane CLI
- `scripts/lib/session.sh` — Session lifecycle, temp directory management
- `scripts/lib/html-generator.sh` — pandoc/highlight.js HTML generation
- `scripts/lib/iterm-pane.sh` — AppleScript iTerm2 integration
- `scripts/lib/file-detection.sh` — File type detection, extension mapping
- `scripts/templates/viewer.html` — HTML + CSS template
- `install.sh` — One-line installer
- `claude-code/SKILL.md` — Claude Code skill definition

## Key Decisions

| Decision | Reasoning |
|----------|-----------|
| pandoc for rendering | Handles markdown tables, code blocks, and Mermaid diagrams natively. Single binary via Homebrew. |
| highlight.js from CDN | No build step needed. Loaded at runtime in the browser. Supports 190+ languages. |
| AppleScript for iTerm2 | Only reliable way to programmatically create split panes, detect profiles, and manage sessions in iTerm2. |
| Per-session temp directories | Each iTerm tab gets its own fileview instance. Prevents concurrent sessions from interfering. |
| `fileedit` as separate tool | Read-only viewing (`fileview`) and editing (`fileedit`) are different use cases with different iTerm2 profile requirements. |

## Gotchas

- `hljs.highlightAuto` misdetects language for unlabeled code blocks in markdown — had to disable auto-detection and rely on explicit language labels only
- AppleScript is fragile across iTerm2 versions — session ID detection requires specific property access patterns
- The `$body$` placeholder in `viewer.html` must be on its own line because `awk` replaces the entire line containing it
