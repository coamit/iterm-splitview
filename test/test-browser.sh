#!/bin/bash
# test-browser.sh — Browser smoke tests for fileview HTML rendering
#
# Verifies that the generated page structure is correct and JS files are servable.
# Does NOT require a running browser — uses curl against the local HTTP server.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/fixtures"

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1"; echo "    $2"; }

# Skip browser tests in CI (needs iTerm2 to open pane + start server)
if [ -n "${CI:-}" ]; then
  echo "Browser smoke tests: skipped in CI (needs iTerm2)"
  exit 0
fi

# Start fileview and wait for server
fileview close 2>/dev/null || true
fileview open "$FIXTURE_DIR/sample.md" 2>/dev/null
sleep 3

# Find the active session's server port
SESSION_DIR=""
for dir in /tmp/fileview/*/; do
  if [ -f "${dir}server_port" ] && [ -f "${dir}index.html" ]; then
    SESSION_DIR="$dir"
  fi
done

if [ -z "$SESSION_DIR" ]; then
  echo "  ✗ Could not find active fileview session"
  exit 1
fi

PORT=$(cat "${SESSION_DIR}server_port")
BASE_URL="http://127.0.0.1:$PORT"

echo "Test: Page serves successfully"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/index.html")
if [ "$HTTP_CODE" = "200" ]; then
  pass "index.html returns HTTP 200"
else
  fail "index.html returns HTTP 200" "Got HTTP $HTTP_CODE"
fi

echo "Test: Page contains body container"
if curl -s "$BASE_URL/index.html" | grep -q 'id="fv-body-container"'; then
  pass "fv-body-container present"
else
  fail "fv-body-container present" "Not found in HTML"
fi

echo "Test: Script tags present"
SCRIPT_COUNT=$(curl -s "$BASE_URL/index.html" | grep -c '<script src="js/' || echo 0)
if [ "$SCRIPT_COUNT" -ge 8 ]; then
  pass "$SCRIPT_COUNT JS module script tags found"
else
  fail "at least 8 JS script tags" "Found $SCRIPT_COUNT"
fi

echo "Test: JS files are servable"
JS_FAIL=0
for jsfile in constants state helpers theme tabs groups swap diff search shortcuts init; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/js/${jsfile}.js")
  if [ "$HTTP_CODE" != "200" ]; then
    fail "js/${jsfile}.js serves" "Got HTTP $HTTP_CODE"
    JS_FAIL=$((JS_FAIL + 1))
  fi
done
if [ "$JS_FAIL" -eq 0 ]; then
  pass "all JS files serve with HTTP 200"
fi

echo "Test: No error indicators in page"
PAGE_CONTENT=$(curl -s "$BASE_URL/index.html")
if echo "$PAGE_CONTENT" | grep -q "INIT ERROR"; then
  fail "no INIT ERROR in page" "Found INIT ERROR"
elif echo "$PAGE_CONTENT" | grep -q "SyntaxError"; then
  fail "no SyntaxError in page" "Found SyntaxError"
else
  pass "no error indicators in page"
fi

echo "Test: Content hash marker present"
if echo "$PAGE_CONTENT" | grep -q 'data-fv-gen="'; then
  pass "data-fv-gen marker present"
else
  fail "data-fv-gen marker present" "Not found"
fi

# Cleanup
fileview close 2>/dev/null || true

# --- Summary ---

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
