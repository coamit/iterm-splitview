# Git Watch + Search + Themes

## Overview

Transformed fileview from a simple file viewer into a lightweight IDE. Added real-time git diff tracking with merge-base diffs, filesystem search with fuzzy matching, 6 color themes, tab groups separating manual files from git-tracked files, and a full keyboard shortcut system.

## Implementation Summary

- **Diff viewer**: collapsed diff mode with context lines, hunk navigation (Ctrl+D), diff stats in tab headers, green/red highlighting for added/removed lines, strikethrough for deletions
- **Git watcher**: `fileview diff` starts a persistent background poller (~6s interval) that runs `git diff $(git merge-base HEAD origin/main)..HEAD`, auto-adds/removes tabs as files change
- **Multi-repo support**: `fileview diff <path>` watches a specific repo; multiple repos can be watched simultaneously
- **Search modal**: Ctrl+O for file search (fuzzy match against filenames), Ctrl+F for full-text search (ripgrep via server endpoint), results rendered in a modal with keyboard navigation
- **Themes**: 6 built-in themes (Midnight, Obsidian, Evergreen, Paper, Latte, Arctic) — 3 dark, 3 light. Persisted to localStorage. Settings modal via Ctrl+/
- **Tab groups**: "Files" group for manually opened tabs, separate group per watched repo for git-tracked tabs. Group bar with counts and switch-on-click
- **Keyboard shortcuts**: Ctrl+D (next diff hunk), Ctrl+X (close tab), Ctrl+C (copy path), Ctrl+J (open in Cursor), Ctrl+← / Ctrl+→ (cycle tabs)

## Key Files

- `scripts/lib/git-diff.sh` — Git diff computation, merge-base resolution
- `scripts/lib/file-watcher.sh` — Polling loop, git change detection, tab sync
- `scripts/js/diff-viewer.js` — Diff context marking, hunk navigation, collapse/expand
- `scripts/js/search-modal.js` — Fuzzy match, file/text search, modal UI
- `scripts/js/theme-engine.js` — Theme definitions, CSS generation, persistence
- `scripts/js/group-bar.js` — Group switching, counts, watch/unwatch
- `scripts/js/keyboard.js` — Shortcut dispatch map

## Key Decisions

| Decision | Reasoning |
|----------|-----------|
| Merge-base diff (not working-tree diff) | Shows PR-style changes since branching from main. More useful for reviewing work-in-progress than seeing all uncommitted changes. |
| Fuzzy matching for file search | Users type partial filenames (e.g., "tbr" matches "tab-bar.js"). More forgiving than exact substring match. |
| ripgrep for text search (server-side) | Fast, respects .gitignore, supports regex. Called from the Python HTTP server endpoint. |
| Group bar separates files from git | Manual files and git-tracked files serve different purposes. Mixing them in one list is confusing — you lose track of what you opened vs. what changed. |
| 6 themes (3 dark, 3 light) | Cover the common preferences. Themes are pure CSS variable overrides — adding a new one is ~20 lines. |

## Gotchas

- The git watcher must handle repos where the remote is not `origin/main` — falls back to detecting the default branch
- Search modal must not steal focus from the main content area when closed — had to explicitly refocus
- Group bar height must remain constant even when a group has 0 tabs — prevents layout shift when switching groups
- Diff stats in tab headers ("+N -M") can make tab widths inconsistent — capped at a max width
