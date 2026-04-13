# Agent Guidelines

Rules for AI agents working on this codebase. Follow these autonomously — don't ask for permission to apply them.

## Onboarding

Before making changes, read [`docs/feature-contexts/README.md`](docs/feature-contexts/README.md) — it has the project overview, architecture, terminology, key decisions, and accumulated knowledge from all past features. That file is the single source of truth for understanding this codebase.

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
