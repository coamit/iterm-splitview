var { describe, it } = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

// Load the helpers.js source and extract pure functions
// (helpers.js uses `window.fv` which doesn't exist in Node, so we eval selectively)
var helpersSource = fs.readFileSync(
  path.join(__dirname, '../../scripts/js/helpers.js'), 'utf8'
);

// Extract escHtml — it's a pure function with no dependencies
var escHtml = new Function(
  'return ' + helpersSource.match(/function escHtml\([^)]*\)\s*\{[^}]+\}/)[0]
)();

// Extract escSelector
var escSelector = new Function(
  'return ' + helpersSource.match(/function escSelector\([^)]*\)\s*\{[^}]+\}/)[0]
)();

describe('escHtml', function() {
  it('escapes ampersands', function() {
    assert.equal(escHtml('a & b'), 'a &amp; b');
  });

  it('escapes angle brackets', function() {
    assert.equal(escHtml('<div>'), '&lt;div&gt;');
  });

  it('escapes double quotes', function() {
    assert.equal(escHtml('"hello"'), '&quot;hello&quot;');
  });

  it('handles strings with no special characters', function() {
    assert.equal(escHtml('hello world'), 'hello world');
  });

  it('handles empty string', function() {
    assert.equal(escHtml(''), '');
  });

  it('escapes multiple special characters in one string', function() {
    assert.equal(
      escHtml('<a href="x&y">'),
      '&lt;a href=&quot;x&amp;y&quot;&gt;'
    );
  });
});

describe('escSelector', function() {
  it('escapes double quotes for CSS selectors', function() {
    assert.equal(escSelector('path/to/"file"'), 'path/to/\\"file\\"');
  });

  it('handles strings without quotes', function() {
    assert.equal(escSelector('/path/to/file.js'), '/path/to/file.js');
  });

  it('handles empty string', function() {
    assert.equal(escSelector(''), '');
  });
});
