var { describe, it } = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

// Load the helpers.js source and extract pure functions
// (helpers.js uses `window.fv` which doesn't exist in Node, so we eval selectively)
var helpersSource = fs.readFileSync(
  path.join(__dirname, '../../scripts/js/helpers.js'), 'utf8'
);

// Extract escapeHtml — it's a pure function with no dependencies
var escapeHtml = new Function(
  'return ' + helpersSource.match(/function escapeHtml\([^)]*\)\s*\{[^}]+\}/)[0]
)();

// Extract escapeCssSelector
var escapeCssSelector = new Function(
  'return ' + helpersSource.match(/function escapeCssSelector\([^)]*\)\s*\{[^}]+\}/)[0]
)();

describe('escapeHtml', function() {
  it('escapes ampersands', function() {
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
  });

  it('escapes angle brackets', function() {
    assert.equal(escapeHtml('<div>'), '&lt;div&gt;');
  });

  it('escapes double quotes', function() {
    assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;');
  });

  it('handles strings with no special characters', function() {
    assert.equal(escapeHtml('hello world'), 'hello world');
  });

  it('handles empty string', function() {
    assert.equal(escapeHtml(''), '');
  });

  it('escapes multiple special characters in one string', function() {
    assert.equal(
      escapeHtml('<a href="x&y">'),
      '&lt;a href=&quot;x&amp;y&quot;&gt;'
    );
  });
});

describe('escapeCssSelector', function() {
  it('escapes double quotes for CSS selectors', function() {
    assert.equal(escapeCssSelector('path/to/"file"'), 'path/to/\\"file\\"');
  });

  it('handles strings without quotes', function() {
    assert.equal(escapeCssSelector('/path/to/file.js'), '/path/to/file.js');
  });

  it('handles empty string', function() {
    assert.equal(escapeCssSelector(''), '');
  });
});
