# Agent Guidelines

Rules for AI agents working on this codebase. Follow these autonomously — don't ask for permission to apply them.

## Onboarding

Before making changes, understand what this project is and how it works.

**What is iterm-splitview?** A lightweight read-only IDE that renders files as styled HTML in an iTerm2 browser split pane. Supports multi-tab viewing, real-time git diff tracking, filesystem search, and 6 themes. Zero context switching — everything stays in the terminal.

**How it works:**
1. CLI (`scripts/fileview`) parses commands and dispatches to bash modules in `scripts/lib/`
2. Bash modules generate HTML from source files using pandoc (markdown) and highlight.js (code)
3. A Python HTTP server (`scripts/lib/http-server.sh`) serves the rendered page and API endpoints
4. iTerm2 opens a browser split pane pointing at the local server
5. 11 JS modules (`scripts/js/`) handle all interactivity: tabs, groups, content swap, diff, search, themes, keyboard shortcuts
6. A file watcher polls for changes and triggers in-place DOM swaps (no page reloads)

**Key constraints:**
- No bundler, no build step, no TypeScript — JS modules loaded via `<script>` tags
- No npm runtime dependencies — pandoc and Python are the only external requirements
- Per-session isolation — each iTerm tab gets its own fileview instance in `/tmp/fileview/<session-id>/`
- Shared state via `window.fv` namespace — each module owns its private state

**Before you start:** Read [`docs/feature-contexts/README.md`](docs/feature-contexts/README.md) for architecture decisions, terminology, and accumulated knowledge from past features.

## Golden Rule

**Preserve existing behavior.** When refactoring, restructuring, or cleaning up code: same features, same UX, same endpoints. No new features, no removed features, no "improvements" unless explicitly requested. If unsure whether a change affects behavior, don't make it.

## File Organization

Organize by **feature domain**, not by code type.

**Wrong**: `helpers.js`, `utils.sh`, `constants.js`, `state.js`
**Right**: `tab-bar.js`, `git-tracking.sh`, `search-modal.js`, `theme-engine.js`

Every file answers: *"What feature does this implement?"*
If you can't answer that in 3 words, the file is doing too much — split it.

Each file owns its own constants, private state, and helper functions. Only genuinely cross-module state goes in a shared namespace (`window.fv` for JS).

## Naming

| Type | Convention | Good | Bad |
|------|-----------|------|-----|
| JS files | hyphenated, feature name | `tab-bar.js` | `tabs.js`, `helpers.js` |
| JS functions | camelCase, verb-first | `activateTab()` | `tabActivation()` |
| JS variables | camelCase, descriptive | `activeTabPath` | `atp`, `fp`, `d` |
| Bash files | hyphenated, feature name | `git-tracking.sh` | `watcher.sh` |
| Bash functions | snake_case, verb-first | `resolve_active_file()` | `raf()` |
| Bash locals | lowercase, descriptive | `file_path` | `fp` |
| Bash constants | UPPER_SNAKE | `POLL_INTERVAL` | `pi` |

**Never use single-letter variables** outside of trivial loop indices (`i`, `j`).

## Functions

- **Max 30 lines.** If longer, extract sub-functions with descriptive names.
- **Single responsibility.** One function, one job.
- **Verb-first naming.** Functions are actions: `createLoadingTab()`, not `loadingTab()`.
- **No side effects in getters.** `getActiveFilePath()` must not modify state.
- **Extract, don't nest.** Inline function definitions inside other functions are a code smell — extract to module level.

## Comments

- **Don't comment what the code does.** Make the code self-explanatory through naming.
- **Do comment why** — when there's a non-obvious reason for a decision.
- **No section separators** (`// ===== Section =====`). If you need them, the file is too long.
- **No commented-out code.** Delete it. Git has history.

## Error Handling

- **Never silently swallow errors.** No `.catch(function() {})`. No `2>/dev/null` on commands that matter.
- **Log or show feedback.** Failed fetch → `console.error()`. Failed bash command → stderr message.
- **Guard null references.** Check `getElementById()` results before calling methods.

## Constants

- **Name every magic number and string** that isn't self-evident.
- **Keep constants in the feature file that uses them**, not in a global constants file.
- **Declare at the top** of the file, before any functions.

## Consistency

- **One pattern per concept.** Don't create DOM elements three different ways across the codebase.
- **Same file structure.** JS modules follow: constants → private state → private functions → public functions.
- **Same error handling everywhere.** Pick one approach and use it consistently.

## Bash Specifics

- **Always quote variables**: `"$variable"`, not `$variable`.
- **Use `local` in functions** to prevent variable leakage.
- **Extract embedded Python** to standalone `.py` files instead of inline heredocs.
- **`readonly` for constants**: `readonly TIMEOUT=30`.

## Refactoring Checklist

Before committing any refactor:

1. `fileview close && fileview open <any-file>` — page loads, syntax highlighting works
2. Open/close tabs — tab switching works
3. Switch between groups — per-group tab memory preserved
4. Touch a file on disk — content updates in-place, no blank page
5. Ctrl+O — search modal opens, file opens with loading tab
6. Ctrl+/ — settings modal opens, theme switching works
7. `fileview diff .` — git watcher starts, diff view renders
8. All keyboard shortcuts still function
9. Open page in Chrome — no JS errors in console

## Development Workflow

See [`docs/sdlc.md`](docs/sdlc.md) for the full guide.

**Every PR that changes behavior must include a feature context file** in `docs/feature-contexts/`. This is part of the definition of done — not a follow-up task.

- **Plan** → for medium+ features, create `docs/feature-contexts/<date>-<type>-<slug>.md` before coding
- **Build** → feature branch, incremental commits, `make check`
- **Review** → refactoring checklist, PR (must include feature context + README.md entry)
- **Preserve** → after merge, verify feature context reflects what was actually built

Knowledge lives in `docs/feature-contexts/`. The [domain README](docs/feature-contexts/README.md) accumulates architecture decisions, terminology, and gotchas across all features.

## What NOT To Do

- Don't add features during a refactor
- Don't rename public API functions that other files depend on without updating all callers
- Don't create `utils`, `helpers`, `common`, or `shared` files — these are code-type names, not feature names
- Don't add TypeScript, bundlers, or build steps unless explicitly requested
- Don't "improve" behavior you find questionable — preserve it and flag it separately
- Don't add comments that restate what the code does
