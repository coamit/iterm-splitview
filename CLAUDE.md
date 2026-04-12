# iterm-splitview — Claude Instructions

These instructions apply when `fileview` is available on PATH.

---

## Tools Overview

| Tool | Purpose | Mode |
|---|---|---|
| `fileview` | Render files as styled HTML in browser split pane (supports tabs) | Read-only |
| `fileview-plan` | Shortcut to reopen active plan file in fileview | Read-only |

---

## Commands

```bash
# Single file (backward-compatible)
fileview open <file>              # Open file in browser split pane
fileview close && fileview open <file>  # Refresh / replace current view

# Multiple files (tabs)
fileview open <f1> <f2> <f3>      # Open multiple files as tabs (last = active)
fileview open <new-file>          # Add a tab to existing pane (no close needed)
fileview close <file>             # Remove a specific tab
fileview list                     # Show current tabs (* = active)

# Git watch — persistent diff tracking
fileview diff                     # Watch current repo (polls every ~6s, auto-manages tabs)
fileview diff ~/dev/repo          # Watch a specific repo by path
fileview unwatch                  # Stop watching current repo
fileview unwatch ~/dev/repo       # Stop watching a specific repo

# Close
fileview close                    # Close pane + clear all tabs
```

**Tab behavior:**
- Opening a file already in tabs just activates it (no duplicate)
- Closing the active tab activates the last remaining tab
- Closing the last tab closes the pane

---

## When to Use fileview (Use Proactively)

Use fileview **autonomously** for ANY response containing:
- Tables, multi-section content, or rich formatting
- Markdown reports, summaries, or structured data
- Plan files

**Pattern:**
1. Write content to `/tmp/claude-response-<short-descriptor>.md`
2. Display: `fileview close && fileview open <path>`
3. Keep terminal output to a **1-3 sentence summary** — the user reads the split pane

---

## Key Rules

- **Be proactive** — don't wait for the user to ask for split pane display
- **Git watch** — `fileview diff` starts a persistent watcher that polls git every ~6s, auto-adding/removing tabs as files change. Git-tracked tabs appear in a separate "Git Changes" group. **Always activate `fileview diff` when starting work that involves git changes** so the user sees diffs in real-time. Run `fileview unwatch` when done.
- **Auto-reload** — a local HTTP server enables live updates; when a displayed file changes, the browser auto-reloads within ~1.5s
- Requires **iTerm2** (not Terminal.app) and uses per-session isolation
