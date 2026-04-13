# iterm-splitview — Domain Knowledge

> Last updated: 2026-04-13

## What Is iterm-splitview

A lightweight read-only IDE that renders files as styled HTML in an iTerm2 browser split pane. Supports multi-tab viewing, real-time git diff tracking, filesystem search, and 6 themes. Designed for zero-context-switching file viewing during terminal-based development.

## Architecture

```
CLI (scripts/fileview)
  ├── Bash modules (scripts/lib/)
  │     session.sh, file-watcher.sh, git-diff.sh, html-generator.sh,
  │     http-server.sh, iterm-pane.sh, file-detection.sh, path-resolver.sh
  ├── HTML template (scripts/templates/viewer.html)
  │     loads 11 JS modules via <script> tags (no bundler)
  ├── JS modules (scripts/js/)
  │     tab-bar, group-bar, content-swap, diff-viewer, search-modal,
  │     theme-engine, keyboard, app, constants, state, helpers
  └── HTTP server (Python, embedded in http-server.sh)
        serves pages, provides API endpoints (/_gen, /_open, /_search, /_tabs)
```

**Flow:** CLI parses commands → bash modules generate HTML via pandoc/highlight.js → Python HTTP server serves the page → iTerm2 opens a browser pane → JS modules handle all interactivity → file-watcher polls for changes and triggers in-place DOM swaps.

## Terminology

| Term | Definition |
|------|-----------|
| Tab group | A named collection of tabs — "Files" for manually opened files, repo name for git-tracked files. Managed by `group-bar.js`. |
| Session | An isolated fileview instance tied to an iTerm tab. Files stored in `/tmp/fileview/<session-id>/`. Managed by `session.sh`. |
| Content swap | In-place DOM replacement when content changes. Fetches new HTML, parses offscreen via `DOMParser`, swaps into the live DOM without a full page reload. Managed by `content-swap.js`. |
| Loading tab | A tab showing a spinner while a file's HTML is being generated server-side. Created by `tab-bar.js`. |
| Gen hash | MD5 content hash embedded in rendered HTML (`data-fv-gen`). Client compares hashes to detect actual content changes, preventing spurious reloads. |
| Git watcher | Background polling loop in `file-watcher.sh` that detects changed files via `git diff` and auto-manages tabs in the git group. |
| Merge-base diff | `git diff $(git merge-base HEAD origin/main)..HEAD` — shows PR-style changes since branching, not working-tree diff. |

## Key Decisions

| Decision | Reasoning | Feature |
|----------|-----------|---------|
| No bundler or build step | Simplicity. JS modules loaded via `<script>` tags. No TypeScript, no webpack, no npm runtime dependencies. | Core viewer (Mar 2026) |
| pandoc for markdown rendering | Handles tables, code blocks, Mermaid diagrams natively. Available via Homebrew. | Core viewer (Mar 2026) |
| Python HTTP server (not Node) | Python available on all macOS. Avoids adding Node as a runtime dependency for end users. | Multi-tab (Apr 2026) |
| Per-session isolation via `/tmp/fileview/<id>/` | Multiple iTerm tabs can each have their own fileview pane without interference. Session GC cleans up dead sessions. | Core viewer (Mar 2026) |
| In-place DOM swap instead of `location.reload()` | Eliminates blank page flashes. Preserves scroll position, theme, active tab state across content updates. | In-place swap (Apr 2026) |
| Content-hash based reload detection | Prevents spurious reloads. Server embeds MD5 hash; client compares before swapping. Replaced time-based suppression. | In-place swap (Apr 2026) |
| Merge-base diff for git tracking | PR-style view shows only changes since branching from main, not all uncommitted changes. More useful for code review. | Git watch (Apr 2026) |
| Feature-based file organization | Every file answers "what feature does this implement?" — not "what code type is this?" Discoverability over categorization. | Modular refactor (Apr 2026) |
| `window.fv` shared state namespace | Minimal cross-module state. Each module owns its private state; only genuinely shared refs go in `window.fv`. | Modular refactor (Apr 2026) |

## Feature History

| Feature | Context File | Date | Summary |
|---------|-------------|------|---------|
| Core viewer + syntax highlighting | [2026-03-26-feature-core-viewer.md](./2026-03-26-feature-core-viewer.md) | Mar 2026 | Initial release: fileview/fileedit CLIs, pandoc rendering, highlight.js, session isolation |
| Multi-tab + auto-reload | [2026-04-08-feature-multi-tab.md](./2026-04-08-feature-multi-tab.md) | Apr 2026 | Tab bar, close buttons, HTTP server, live auto-reload |
| Git watch + search + themes | [2026-04-10-feature-git-search-themes.md](./2026-04-10-feature-git-search-themes.md) | Apr 2026 | Diff viewer, search modal, 6 themes, tab groups, multi-repo git watcher |
| In-place swap + UX polish | [2026-04-12-feature-in-place-swap.md](./2026-04-12-feature-in-place-swap.md) | Apr 2026 | DOM swap, loading tabs, per-group tab memory, multi-arg CLI |
| Modular refactor + quality | [2026-04-13-refactor-modular-codebase.md](./2026-04-13-refactor-modular-codebase.md) | Apr 2026 | 11 JS modules, ESLint + ShellCheck, tests, CI, feature-based naming |
