# iterm-splitview — Claude Instructions

These instructions apply when `fileview` and `fileedit` are available on PATH.

---

## Tools Overview

| Tool | Purpose | Mode |
|---|---|---|
| `fileview` | Render markdown as styled HTML in browser split pane | Read-only |
| `fileedit` | Open file in `fresh` terminal editor in split pane | Editable |
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

## When to Use fileedit (Use Proactively)

Use fileedit **autonomously** when:
- Your response involves a file the user may want to edit — open it in fileedit automatically
- The user asks to review, inspect, or work on a specific file
- Discussing config files, source code, or notes the user might modify

**Commands:**
```bash
fileedit open <file-path>   # Open file in fresh editor in split pane
fileedit close              # Close the editor split pane
```

---

## Key Rules

- **Be proactive** — don't wait for the user to ask for split pane display
- **fileview** = read-only styled HTML (markdown, tables, reports, plans)
- **fileedit** = editable terminal editor (code, config, notes)
- Both require **iTerm2** (not Terminal.app) and use per-session isolation
- Only one split pane tool at a time — close one before opening the other
