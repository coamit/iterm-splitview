# In-Place Swap + UX Polish

## Overview

Eliminated all blank page flashes by replacing `location.reload()` with in-place DOM swapping. Added loading tab UI with spinners, per-group tab memory, multi-argument support for close/diff/unwatch commands, and thread-safe file operations.

## Implementation Summary

- **Content swap**: fetch new HTML via `/_gen` hash comparison → fetch `/index.html` → parse with `DOMParser` offscreen → initialize (hljs, mermaid, diff attributes) → swap into live DOM → restore view state (scroll, active tab, active group)
- **Loading tabs**: when a file is being generated server-side, a tab with a spinner appears immediately so the user sees progress
- **Per-group tab memory**: switching between tab groups remembers which tab was last active in each group
- **Multi-arg CLI**: `fileview close f1 f2`, `fileview diff repo1 repo2`, `fileview unwatch repo1 repo2` — loop over `"$@"`
- **Thread lock**: `threading.Lock()` in the Python HTTP server prevents race conditions when concurrent `/_open` requests modify the tab file simultaneously
- **Loading group detection**: correctly identifies when a tab belongs to a loading group even when hidden tabs from other groups still have `.active` class

## Key Files

- `scripts/js/content-swap.js` — Core swap mechanism: `pollReload()`, `performSwap()`, `saveViewState()`, `restoreViewState()`
- `scripts/js/tab-bar.js` — `createLoadingTab()`, `attachBodyListeners()` (re-attaches all event listeners after DOM swap)
- `scripts/js/group-bar.js` — `switchTabGroup()` saves current tab to `groupLastTab` map before switching
- `scripts/fileview` — `cmd_close()`, `cmd_diff()`, `cmd_unwatch()` updated to loop over multiple arguments

## Key Decisions

| Decision | Reasoning |
|----------|-----------|
| DOMParser for offscreen initialization | Parse and initialize new content in memory before swapping. User never sees uninitialized content (unstyled code, raw mermaid blocks). |
| Content hash comparison before swap | Only swap DOM when content actually changed. Prevents visual disruption from polling cycles that detect no changes. |
| Clear loading groups BEFORE tab restore | `switchTabGroup()` checks `loadingGroups` and early-returns if the group is still loading. Must clear the loading state first, then restore the tab. Order matters. |
| `lastOpenedFilePath` only used when `isOnLoadingTab` | Prevents jumping the user back to a loading tab after they've navigated away. Respects user intent. |
| Thread lock on tab file | Concurrent `/_open` requests from rapid `fileview open` calls do read-modify-write on the tab file. Without a lock, tabs get lost. |

## Gotchas

- `attachBodyListeners()` must re-attach ALL event listeners after a DOM swap — toolbar buttons (`fv-add-git`, `fv-add-file`, `fv-settings-btn`, `fv-refresh`), not just tab/content listeners
- Hidden tabs from other groups still have `.active` class — can't use `!activeTab` to detect if the current group has no active tab
- The `$body$` placeholder in `viewer.html` must be on its own line — awk replaces the entire line containing it, which eats the wrapper `<div>` if they're on the same line
- Loading group detection must happen before tab restore in `performSwap()` — moving it even one step later breaks the flow
