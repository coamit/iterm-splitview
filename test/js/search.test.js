var { describe, it } = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

// Load search.js source and extract pure functions
var searchSource = fs.readFileSync(
  path.join(__dirname, '../../scripts/js/search.js'), 'utf8'
);

// Extract fuzzyMatch — pure function, no dependencies
var fuzzyMatch = new Function(
  'return ' + searchSource.match(/function fuzzyMatch\(text, query\)\s*\{[\s\S]*?\n\}/)[0]
)();

// Extract fuzzyHighlight — pure function, no dependencies
var fuzzyHighlight = new Function(
  'return ' + searchSource.match(/function fuzzyHighlight\(text, query\)\s*\{[\s\S]*?\n\}/)[0]
)();

describe('fuzzyMatch', function() {
  it('matches exact substring', function() {
    assert.equal(fuzzyMatch('hello world', 'hello'), true);
  });

  it('matches scattered characters in order', function() {
    assert.equal(fuzzyMatch('render.sh', 'rsh'), true);
  });

  it('is case insensitive', function() {
    assert.equal(fuzzyMatch('MyFile.js', 'myfile'), true);
  });

  it('rejects when characters are missing', function() {
    assert.equal(fuzzyMatch('abc', 'abcd'), false);
  });

  it('rejects when order is wrong', function() {
    assert.equal(fuzzyMatch('abc', 'cba'), false);
  });

  it('matches empty query against any text', function() {
    assert.equal(fuzzyMatch('anything', ''), true);
  });

  it('handles empty text with non-empty query', function() {
    assert.equal(fuzzyMatch('', 'a'), false);
  });

  it('matches single character', function() {
    assert.equal(fuzzyMatch('config.sh', 'c'), true);
  });

  it('matches full filename', function() {
    assert.equal(fuzzyMatch('viewer.html', 'viewer.html'), true);
  });
});

describe('fuzzyHighlight', function() {
  it('wraps matched characters in <mark> tags', function() {
    var result = fuzzyHighlight('hello', 'hlo');
    assert.equal(result, '<mark>h</mark>e<mark>l</mark>l<mark>o</mark>');
  });

  it('escapes HTML in the text', function() {
    var result = fuzzyHighlight('<div>', 'div');
    assert.equal(result, '&lt;<mark>d</mark><mark>i</mark><mark>v</mark>&gt;');
  });

  it('returns escaped text when query is empty', function() {
    var result = fuzzyHighlight('<b>bold</b>', '');
    assert.equal(result, '&lt;b&gt;bold&lt;/b&gt;');
  });

  it('handles no matches gracefully', function() {
    var result = fuzzyHighlight('abc', 'xyz');
    assert.equal(result, 'abc');
  });

  it('is case insensitive', function() {
    var result = fuzzyHighlight('Hello', 'h');
    assert.equal(result, '<mark>H</mark>ello');
  });
});
