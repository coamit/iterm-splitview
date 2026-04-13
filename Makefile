.PHONY: lint lint-shell lint-js test test-js test-cli test-browser check

check: lint test

# --- Linting ---

lint: lint-shell lint-js

lint-shell:
	@echo "=== ShellCheck ==="
	@shellcheck -x -S warning scripts/fileview scripts/fileedit scripts/lib/*.sh

lint-js:
	@echo "=== ESLint ==="
	@npx --yes eslint@9 scripts/js/*.js

# --- Tests ---

test: test-js test-cli test-browser

test-js:
	@echo "=== JS Unit Tests ==="
	@node --test test/js/*.test.js

test-cli:
	@echo "=== CLI Integration Tests ==="
	@bash test/test-fileview.sh

test-browser:
	@echo "=== Browser Smoke Tests ==="
	@bash test/test-browser.sh
