# Multi-Tab + Auto-Reload

## Overview

Added multi-tab support so multiple files can be viewed simultaneously in the same pane, and a local HTTP server for live auto-reload when files change on disk. Previously, each `fileview open` replaced the entire pane content.

## Implementation Summary

- Tab bar UI with file icons, close buttons (×), and horizontal scrolling
- `fileview open <file>` adds a tab to the existing pane (no duplicate if already open)
- `fileview close <file>` removes a specific tab; closing the last tab closes the pane
- Local Python HTTP server serves the HTML page and provides API endpoints
- File watcher polls for changes; browser auto-reloads via JavaScript polling (`/_gen` endpoint returns content hash)
- ~2-4s faster open time by reusing existing server and pane instead of recreating them
- Ctrl+J shortcut to open the current file in Cursor

## Key Files

- `scripts/lib/http-server.sh` — Python HTTP server (embedded), serves pages and API endpoints
- `scripts/lib/file-watcher.sh` — Polls for file changes, triggers HTML regeneration
- `scripts/lib/html-generator.sh` — Updated to generate tabbed HTML with multiple file bodies
- `scripts/templates/viewer.html` — Tab bar CSS and structure added

## Key Decisions

| Decision | Reasoning |
|----------|-----------|
| Python HTTP server (not Node) | Python ships with macOS. Avoids adding Node as a runtime dependency. Simple enough for serving static HTML + a few API endpoints. |
| Content hash for reload detection | Server generates MD5 of the HTML content. Browser polls `/_gen` and reloads only when hash changes. Prevents spurious reloads from file watcher touching the HTML without actual content changes. |
| Tab deduplication by absolute path | `fileview open` resolves to absolute path before adding. Prevents the same file appearing twice when opened via different relative paths. |
| Reuse existing pane and server | Opening a new file adds a tab to the existing session instead of closing and recreating everything. Much faster and avoids UI flicker. |

## Gotchas

- The HTTP server runs in the background and must be cleaned up on `fileview close` — orphaned servers consume a port
- Tab bar horizontal scroll position resets on reload — had to save/restore scroll position
- The `/_gen` endpoint must return quickly (just reads a file) because the browser polls it every 1.5s
