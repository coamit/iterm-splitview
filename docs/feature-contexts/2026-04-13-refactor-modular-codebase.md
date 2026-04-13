# Modular Refactor + Quality Infrastructure

## Overview

Split a 2100-line inline `<script>` block into 11 focused JS modules, added linting (ESLint + ShellCheck), testing (Node unit tests + CLI integration tests + browser smoke tests), GitHub Actions CI, and renamed all files/functions/variables to feature-based, self-explanatory names. Pure refactor — zero behavior changes.

## Implementation Summary

- **JS modularization**: extracted 11 files from inline script in `viewer.html`: `tab-bar.js`, `group-bar.js`, `content-swap.js`, `diff-viewer.js`, `search-modal.js`, `theme-engine.js`, `keyboard.js`, `app.js`, `constants.js`, `state.js`, `helpers.js`
- **Linting**: ESLint 9 (flat config) with `no-unused-vars`, `id-length: min 2`, `max-lines-per-function: 40`; ShellCheck with `-x -S warning`
- **Testing**: 23 JS unit tests (fuzzyMatch, fuzzyHighlight, escapeHtml, escapeCssSelector), 13 CLI integration tests, browser smoke tests
- **CI**: GitHub Actions on macOS runner, runs `make lint` + `make test-js` + `make test-cli` on every PR
- **Feature-based naming**: renamed all bash files (`config.sh` → `session.sh`, etc.), all JS files (`tabs.js` → `tab-bar.js`, etc.), functions (`escHtml` → `escapeHtml`, etc.), and variables (`fp` → `filePath`, `*Btn` → `*Button`, etc.)
- **Documentation**: CONTRIBUTING.md (architecture + code standards), AGENTS.md (AI agent guidelines)

## Key Files

- `eslint.config.js` — ESLint 9 flat config with globals for all cross-module functions
- `Makefile` — `make lint`, `make test`, `make check` targets
- `.github/workflows/ci.yml` — GitHub Actions CI pipeline
- `test/js/helpers.test.js` — Unit tests for escapeHtml, escapeCssSelector
- `test/js/search.test.js` — Unit tests for fuzzyMatch, fuzzyHighlight
- `test/test-fileview.sh` — CLI integration tests
- `test/test-browser.sh` — Browser smoke tests (HTTP server, page structure)
- `CONTRIBUTING.md` — Architecture guide and code standards
- `AGENTS.md` — AI agent coding guidelines

## Key Decisions

| Decision | Reasoning |
|----------|-----------|
| 11 separate JS files via `<script>` tags (no bundler) | Keeps the zero-build-step philosophy. Each file is a self-contained module. Browser loads them in order. |
| ESLint 9 flat config (not `.eslintrc`) | ESLint 9 requires flat config format. Pinned to v9 because v10 requires Node 22+ (CI uses Node 20). |
| Node built-in test runner (not Jest) | Zero dependencies. `node --test` works out of the box. Tests extract pure functions from source via regex + `new Function()`. |
| Function extraction via regex for testing | JS modules use `var` and attach to `window` — not ES modules. Can't `require()` them. Regex extraction of pure functions lets us test without a DOM environment. |
| macOS CI runner | ShellCheck install via Homebrew, iTerm2-dependent tests need macOS. Linux runners can't run the full test suite. |
| Feature-based naming convention | `tab-bar.js` tells you it handles tabs. `tabs.js` could be anything. Applied uniformly: files, functions, variables. |

## Gotchas

- ESLint globals must list every function that's called across JS files — missing one causes a false "undefined" warning
- `max-lines-per-function: 40` required splitting several large functions during the refactor
- The `new Function()` test extraction pattern only works for pure functions with no external dependencies
- CI CLI tests must skip when `CI=true` because they need an active iTerm2 session to create panes
- Browser smoke tests check that all JS files are servable via HTTP — if a file is renamed but `viewer.html` script tags aren't updated, the test catches it
