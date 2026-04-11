# fileview Git Watcher — Agent Instructions

## Adding a Git Watcher

To track git changes for a repository in fileview's split pane:

```bash
fileview diff /path/to/repo
```

This adds a "Git Changes (repo-name)" group to the tab bar that automatically tracks:
- Unstaged changes (`git diff`)
- Staged changes (`git diff --cached`)
- Untracked files (`git ls-files --others`)
- Commits not pushed to remote (`git diff origin/<branch>..HEAD`)

The watcher polls every ~6 seconds and auto-adds/removes tabs as files change.

**Examples:**
```bash
# Watch current directory's repo
fileview diff

# Watch a specific repo
fileview diff ~/development/my-project

# Watch multiple repos (run multiple times)
fileview diff ~/development/frontend
fileview diff ~/development/backend
```

If the repo is already being watched, the command is a no-op.

## Removing a Git Watcher

```bash
fileview unwatch /path/to/repo

# Or unwatch current directory's repo
fileview unwatch
```

The watcher stops tracking that repo and removes all its tabs.

Git watcher groups can also be removed by clicking the × button on the group selector in the UI.

## When to Use

- **Starting a feature**: `fileview diff` to see your changes alongside open files
- **Multi-repo work**: `fileview diff ~/dev/frontend` + `fileview diff ~/dev/backend` to track changes across services
- **Code review prep**: Watch the repo to see all changed files at a glance
- **After finishing**: `fileview unwatch` to clean up

## Behavior Notes

- Git tabs cannot be individually closed (they're auto-managed)
- Selecting a group hides tabs from other groups
- The active group is highlighted in the group bar
- Ctrl+P shows groups alongside tabs for quick switching
- File changes are detected every ~6 seconds
