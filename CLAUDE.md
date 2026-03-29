# iterm-splitview — Claude Instructions

These instructions apply when `fileview` is available on PATH.

---

## Tools Overview

| Tool | Purpose | Mode |
|---|---|---|
| `fileview` | Render markdown as styled HTML in browser split pane | Read-only |
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

**Refresh:** `fileview close && fileview open <path>` (browser doesn't auto-reload)

**Close:** `fileview close` when the response doesn't need the split pane

---

## Key Rules

- **Be proactive** — don't wait for the user to ask for split pane display
- Requires **iTerm2** (not Terminal.app) and uses per-session isolation
