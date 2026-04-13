#!/bin/bash
# test-fileview.sh — CLI integration tests for fileview tab management
#
# Tests the fileview CLI commands end-to-end: open, close, diff, unwatch.
# Skips pane/browser tests in CI (no iTerm2 available).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/fixtures"

# Add project scripts to PATH so fileview is available
export PATH="$PROJECT_DIR/scripts:$PATH"

# In CI, fileview needs an iTerm session which doesn't exist — skip all tests
if [ -n "${CI:-}" ]; then
  echo "CLI tests: skipped in CI (needs iTerm2)"
  exit 0
fi

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1"; echo "    Expected: $2"; echo "    Got: $3"; }

assert_tab_count() {
  local expected="$1"
  local actual
  actual=$(fileview list 2>/dev/null | grep -c '\..*(' || echo 0)
  if [ "$actual" -eq "$expected" ]; then
    pass "tab count is $expected"
  else
    fail "tab count is $expected" "$expected" "$actual"
  fi
}

assert_active_tab() {
  local expected_name="$1"
  local active_line
  active_line=$(fileview list 2>/dev/null | grep '^\*' || echo "")
  if echo "$active_line" | grep -q "$expected_name"; then
    pass "active tab is $expected_name"
  else
    fail "active tab is $expected_name" "$expected_name" "$active_line"
  fi
}

assert_tab_exists() {
  local name="$1"
  if fileview list 2>/dev/null | grep -q "$name"; then
    pass "tab '$name' exists"
  else
    fail "tab '$name' exists" "present" "missing"
  fi
}

assert_tab_missing() {
  local name="$1"
  if ! fileview list 2>/dev/null | grep -q "$name"; then
    pass "tab '$name' is gone"
  else
    fail "tab '$name' is gone" "absent" "still present"
  fi
}

assert_group_exists() {
  local name="$1"
  if fileview list 2>/dev/null | grep -q "Git Changes ($name)"; then
    pass "git group '$name' exists"
  else
    fail "git group '$name' exists" "present" "missing"
  fi
}

assert_group_missing() {
  local name="$1"
  if ! fileview list 2>/dev/null | grep -q "Git Changes ($name)"; then
    pass "git group '$name' is gone"
  else
    fail "git group '$name' is gone" "absent" "still present"
  fi
}

cleanup() {
  fileview close 2>/dev/null || true
}

# --- Tests ---

echo "Test: Open single file"
cleanup
fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
assert_tab_count 1
assert_active_tab "sample.md"
cleanup

echo "Test: Open multiple files"
cleanup
fileview open "$FIXTURE_DIR/sample.md" "$FIXTURE_DIR/sample.js" 2>/dev/null
assert_tab_count 2
assert_active_tab "sample.js"
cleanup

echo "Test: Close single file"
cleanup
fileview open "$FIXTURE_DIR/sample.md" "$FIXTURE_DIR/sample.js" 2>/dev/null
fileview close "$FIXTURE_DIR/sample.md" 2>/dev/null
assert_tab_count 1
assert_tab_missing "sample.md"
assert_tab_exists "sample.js"
cleanup

echo "Test: Close multiple files at once"
cleanup
fileview open "$FIXTURE_DIR/sample.md" "$FIXTURE_DIR/sample.js" "$PROJECT_DIR/README.md" 2>/dev/null
fileview close "$FIXTURE_DIR/sample.md" "$FIXTURE_DIR/sample.js" 2>/dev/null
assert_tab_count 1
assert_tab_missing "sample.md"
assert_tab_missing "sample.js"
assert_tab_exists "README.md"
cleanup

echo "Test: Duplicate open does not create duplicate tab"
cleanup
fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
assert_tab_count 1
cleanup

echo "Test: Active tab after closing active"
cleanup
fileview open "$FIXTURE_DIR/sample.md" "$FIXTURE_DIR/sample.js" 2>/dev/null
fileview close "$FIXTURE_DIR/sample.js" 2>/dev/null
assert_active_tab "sample.md"
cleanup

echo "Test: Watch repository"
if [ "${FV_TEST_PANE:-}" = "1" ]; then
  fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
  sleep 1
  fileview diff "$PROJECT_DIR" 2>/dev/null
  sleep 2
  assert_group_exists "iterm-splitview"
else
  echo "  ⊘ Skipped (needs iTerm2 pane)"
fi

echo "Test: Unwatch repository"
if [ "${FV_TEST_PANE:-}" = "1" ]; then
  cleanup
  fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
  fileview diff "$PROJECT_DIR" 2>/dev/null
  fileview unwatch "$PROJECT_DIR" 2>/dev/null
  assert_group_missing "iterm-splitview"
  cleanup
else
  echo "  ⊘ Skipped (needs iTerm2 pane)"
fi

# --- Summary ---

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
