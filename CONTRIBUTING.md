# Contributing to iterm-splitview

Architecture, code standards, and guidelines for maintaining a clean, readable codebase.

## Development

```bash
make lint          # ShellCheck (bash) + ESLint (JS)
make test          # JS unit tests + CLI integration tests + browser smoke tests
make check         # Both lint and test

make lint-shell    # ShellCheck only
make lint-js       # ESLint only
make test-js       # JS unit tests only (node --test)
make test-cli      # CLI integration tests only (needs iTerm2)
make test-browser  # Browser smoke tests only (needs iTerm2)
```

**Requirements**: Node 18+, ShellCheck (`brew install shellcheck`), iTerm2 (for CLI/browser tests).

CI runs `make lint` + `make test-js` + `make test-cli` on every PR via GitHub Actions. All checks must pass before merge.

### Workflow

Every PR that changes behavior must include a feature context update in [`docs/feature-contexts/`](docs/feature-contexts/). See the [development workflow](docs/sdlc.md) for the full process.

---

## Architecture

### Feature-Based File Organization

Every file owns a **feature domain** — not a code type. A file named `helpers.js` or `utils.sh` is a code smell. Instead, each file should answer: *"What feature does this implement?"*

```
scripts/
  fileview              # CLI entry point: parses commands, dispatches to features
  fileedit              # CLI for terminal editor split pane
  fileview-plan         # Plan file shortcut

  lib/
    session.sh          # Session lifecycle: create, detect, clean up
    tabs.sh             # Tab file management: add, remove, list, resolve active
    rendering.sh        # HTML generation: template substitution, content rendering
    git-tracking.sh     # Git watcher: diff computation, repo sync, polling
    http-server.py      # HTTP server: endpoints, search, file serving (standalone Python)
    iterm-pane.sh       # iTerm2 integration: split pane, profiles, AppleScript
    file-detection.sh   # File type detection: extensions, languages, MIME

  js/
    tab-bar.js          # Tab switching, creation, closing, cycling, loading tabs
    group-bar.js        # Group management: switching, counts, watch/unwatch, loading states
    content-swap.js     # In-place DOM swap: fetch, parse, initialize, restore state
    diff-viewer.js      # Diff navigation: context marking, hunk jumping, collapse/expand
    search-modal.js     # Search UI: fuzzy match, file/text search, modals, results
    theme-engine.js     # Theme system: definitions, CSS generation, persistence
    keyboard.js         # Keyboard shortcuts: dispatch map, handler registration
    app.js              # Application bootstrap: DOM refs, pollers, event wiring, init

  templates/
    viewer.html         # HTML + CSS template (no inline JS)
```

### Why Feature-Based?

- **Single Responsibility**: `git-tracking.sh` handles everything git. Not "some git in watcher.sh, some in diff.sh, some in render.sh".
- **Discoverability**: Looking for search logic? It's in `search-modal.js`. Not spread across `helpers.js`, `init.js`, and `state.js`.
- **Encapsulation**: Each file manages its own state, constants, and helpers internally. Cross-cutting state is minimal and explicit.

### Shared State (JavaScript)

Use `window.fv` as the shared state namespace. Keep it minimal — only state that genuinely needs cross-module access:

```javascript
// In app.js — the only file that initializes window.fv
window.fv = {
  // DOM references needed by multiple modules
  elements: { toast: null, diffBadge: null, ... },
  // Cross-module mutable state
  genTime: null,
  swapInProgress: false
};
```

Module-specific state stays private to that module:

```javascript
// In search-modal.js — private to this module
var selectedIndex = 0;
var currentMode = 'files';
var searchTimer = null;
```

---

## Code Standards

### Naming

| Type | Convention | Examples |
|------|-----------|----------|
| Files | Hyphenated, feature-descriptive | `tab-bar.js`, `git-tracking.sh` |
| JS functions | camelCase, verb-first | `activateTab()`, `fetchSearchResults()` |
| JS variables | camelCase, noun-descriptive | `activeTabPath`, `loadingGroups` |
| Bash functions | snake_case, verb-first | `resolve_active_file()`, `sync_repo_tabs()` |
| Bash variables | UPPER_SNAKE for constants, lower for locals | `POLL_INTERVAL`, `file_path` |
| CSS classes | Prefixed, hyphenated | `.fv-tab-bar`, `.fv-group-sel` |

**Bad names**: `t`, `d`, `fp`, `gtf`, `rname`, `iv`, `ac`, `lxhr`, `q`
**Good names**: `theme`, `response`, `filePath`, `gitTabFile`, `repoName`, `pollInterval`, `activeContent`, `loadingXhr`, `query`

### Functions

- **Max 30 lines**. If longer, split into sub-functions with descriptive names.
- **Single responsibility**. A function does one thing. `generateHTML()` should not also start the watcher.
- **Verb-first naming**. Functions are actions: `createLoadingTab()`, not `loadingTab()`.
- **No side effects in query functions**. `getActiveFilePath()` should not modify state.
- **Extract, don't nest**. If you write an inline function inside another function, extract it to module level with a clear name.

```javascript
// Bad: 90-line function doing 4 things
function applyTheme(id) {
  // ...get theme... update hljs... generate 50 CSS rules... render grid...
}

// Good: orchestrator + focused sub-functions
function applyTheme(id) {
  var theme = themes[id];
  if (!theme) return;
  updateHighlightTheme(theme);
  injectThemeCSS(buildThemeCSS(theme));
  persistThemeChoice(id);
}
```

### Comments

- **Don't comment what the code does** — make the code self-explanatory through naming.
- **Do comment why** — when a non-obvious decision was made.
- **No section-separator comments** (`// ===== Section =====`). If you need separators, the file is too long — split it.
- **No commented-out code**. Delete it. Git has history.

```javascript
// Bad
// Check if the tab is active
if (tab.classList.contains('active')) { ... }

// Good — no comment needed, the code is clear
if (tab.classList.contains('active')) { ... }

// Good — explains WHY, not what
// switchGroup doesn't deactivate tabs from other groups,
// so a hidden tab may still have .active class
var wasOnLoadingGroup = activeGroupSel && loadingGroups[activeGroup];
```

### Error Handling

- **Never silently swallow errors**. `.catch(function() {})` hides bugs.
- **Log or show feedback**. If a fetch fails, show a toast or log to console.
- **Fail fast in bash**. Use `set -euo pipefail` where appropriate. Check return codes.
- **Guard null references**. Check `getElementById` results before calling methods on them.

```javascript
// Bad
fetch('/_open?path=' + path).catch(function() {});

// Good
fetch('/_open?path=' + path).catch(function(err) {
  console.error('Failed to open file:', err);
});
```

### Magic Numbers & Strings

- **Name every constant** that isn't self-evident from context.
- **Keep constants near their feature**, not in a global constants file.
- **Exception**: CSS values in stylesheets are fine as-is.

```javascript
// Bad — what does 5000 mean?
if ((Date.now() - lastOpenTriggered) < 5000) return;

// Good — named constant near its usage
var OPEN_COOLDOWN_MS = 5000;
if ((Date.now() - lastOpenTriggered) < OPEN_COOLDOWN_MS) return;
```

### Consistency

- **One pattern per concept**. Don't create DOM elements three different ways.
- **Same structure across files**. Each JS module follows: constants at top, private state, private functions, public functions.
- **Same error handling pattern everywhere**. Don't mix `.catch(() => {})` with `try/catch` with no handling.

---

## Bash-Specific Guidelines

### Script Structure

```bash
#!/bin/bash
# script-name.sh — One-line description of what this script does

set -euo pipefail  # Strict mode (where appropriate)

# Constants
readonly POLL_INTERVAL=2
readonly MAX_RETRIES=3

# Functions (alphabetical or dependency order)
function_name() {
  local variable_name="$1"
  # ...
}

# Main logic (at the bottom, after all function definitions)
main() { ... }
main "$@"
```

### Variables

- **Always quote variables**: `"$variable"`, not `$variable`.
- **Use `local` in functions**: Prevent variable leakage.
- **Descriptive names**: `file_path`, not `fp`. `repo_name`, not `rname`.
- **`readonly` for constants**: `readonly TIMEOUT=30`.

### Embedded Python

- **Extract to separate `.py` files** instead of inline heredocs in bash.
- The HTTP server should be `scripts/lib/http-server.py`, not 500 lines of Python inside `server.sh`.

---

## What "Production Grade" Means Here

1. **Any developer can find any feature in under 10 seconds** by reading file names.
2. **Any function can be understood in under 30 seconds** without scrolling.
3. **Changing one feature doesn't require reading 5 files** to understand dependencies.
4. **Errors are visible**, not silently swallowed.
5. **Tests can be written** for individual functions without mocking the entire app.
6. **New features follow existing patterns** without inventing new ones.
