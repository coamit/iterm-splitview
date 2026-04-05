# iterm-splitview — Claude Instructions

These instructions apply when `fileview` is available on PATH.

---

## Tools Overview

| Tool | Purpose | Mode |
|---|---|---|
| `fileview` | Render files as styled HTML in browser split pane (supports tabs) | Read-only |
| `fileview-plan` | Shortcut to reopen active plan file in fileview | Read-only |

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

**Multi-tab:** `fileview open <file>` adds a tab to the existing pane (no close needed).

**Close:** `fileview close` closes pane + all tabs. `fileview close <file>` removes one tab.

---

## Key Rules

- **Be proactive** — don't wait for the user to ask for split pane display
- Requires **iTerm2** (not Terminal.app) and uses per-session isolation
