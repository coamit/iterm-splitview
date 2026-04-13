// diff.js — Diff context marking, hunk navigation, counter badge, collapse toggle
var fv = window.fv;

function createDiffSeparator() {
  var spacerA = document.createElement('div');
  spacerA.className = 'code-line diff-spacer';
  spacerA.innerHTML = '<span class="ln"></span><span class="lc"></span>';
  var sep = document.createElement('div');
  sep.className = 'code-line diff-separator';
  sep.innerHTML = '<span class="ln"></span><span class="lc"></span>';
  var spacerB = document.createElement('div');
  spacerB.className = 'code-line diff-spacer';
  spacerB.innerHTML = '<span class="ln"></span><span class="lc"></span>';
  return { spacerA: spacerA, sep: sep, spacerB: spacerB };
}

// eslint-disable-next-line max-lines-per-function
function markDiffContext(panel) {
  var allCodeLines = panel.querySelectorAll('.code-lines');
  allCodeLines.forEach(function(codeBlock) { // eslint-disable-line max-lines-per-function
    var lines = Array.from(codeBlock.querySelectorAll('.code-line'));
    var diffIndices = [];
    lines.forEach(function(line, idx) {
      if (line.classList.contains('diff-added') || line.classList.contains('diff-removed')) {
        diffIndices.push(idx);
      }
    });
    if (diffIndices.length === 0) return;
    // Mark context lines
    var contextSet = {};
    diffIndices.forEach(function(idx) {
      for (var ci = Math.max(0, idx - DIFF_CONTEXT_LINES); ci <= Math.min(lines.length - 1, idx + DIFF_CONTEXT_LINES); ci++) {
        contextSet[ci] = true;
      }
    });
    lines.forEach(function(line, idx) {
      if (contextSet[idx] && !line.classList.contains('diff-added') && !line.classList.contains('diff-removed')) {
        line.classList.add('diff-context');
      }
    });
    // Add separators between non-adjacent context groups
    var visibleIndices = Object.keys(contextSet).map(Number).concat(diffIndices).sort(function(first, second) { return first - second; });
    var unique = visibleIndices.filter(function(val, idx, arr) { return !idx || val !== arr[idx - 1]; });

    // Separator at top if first visible line isn't line 1
    if (unique.length > 0 && unique[0] > 0) {
      var parts = createDiffSeparator();
      lines[unique[0]].parentNode.insertBefore(parts.spacerA, lines[unique[0]]);
      lines[unique[0]].parentNode.insertBefore(parts.sep, lines[unique[0]]);
      lines[unique[0]].parentNode.insertBefore(parts.spacerB, lines[unique[0]]);
    }

    // Separators between non-adjacent groups
    for (var i = 1; i < unique.length; i++) {
      if (unique[i] - unique[i - 1] > 1) {
        var parts = createDiffSeparator();
        lines[unique[i]].parentNode.insertBefore(parts.spacerA, lines[unique[i]]);
        lines[unique[i]].parentNode.insertBefore(parts.sep, lines[unique[i]]);
        lines[unique[i]].parentNode.insertBefore(parts.spacerB, lines[unique[i]]);
      }
    }

    // Separator at bottom if last visible line isn't the last line
    if (unique.length > 0 && unique[unique.length - 1] < lines.length - 1) {
      var lastVisible = lines[unique[unique.length - 1]];
      var parts = createDiffSeparator();
      lastVisible.parentNode.appendChild(parts.spacerA);
      lastVisible.parentNode.appendChild(parts.sep);
      lastVisible.parentNode.appendChild(parts.spacerB);
    }
  });
}

function getDiffHunks() {
  var activePanel = document.querySelector('.fv-tab-content.active');
  if (!activePanel) activePanel = document;
  var lines = activePanel.querySelectorAll('.code-line.diff-added, .code-line.diff-removed');
  var hunks = [];
  var lastIdx = -2;
  lines.forEach(function(line) {
    var allLines = Array.from(line.closest('.code-lines').querySelectorAll('.code-line'));
    var idx = allLines.indexOf(line);
    if (idx - lastIdx > 1) hunks.push(line);
    lastIdx = idx;
  });
  return hunks;
}

function _clearDiffCounterListeners() {
  if (fv._diffCounterDismiss) {
    document.removeEventListener('click', fv._diffCounterDismiss);
    document.removeEventListener('keydown', fv._diffCounterDismiss);
    fv._diffCounterDismiss = null;
  }
}

function showDiffCounter() {
  var hunks = getDiffHunks();
  if (hunks.length === 0 || fv.currentDiffIdx < 0) return;
  fv.diffCounterBadge.textContent = (fv.currentDiffIdx + 1) + '/' + hunks.length;
  fv.diffCounterBadge.classList.add('visible');
  _clearDiffCounterListeners();
  fv._diffCounterDismiss = function(e) {
    if (e.type === 'keydown' && e.ctrlKey && e.key === 'd') return;
    fv.diffCounterBadge.classList.remove('visible');
    document.querySelectorAll('.code-line.diff-focus').forEach(function(el) { el.classList.remove('diff-focus'); });
    _clearDiffCounterListeners();
  };
  setTimeout(function() {
    document.addEventListener('click', fv._diffCounterDismiss);
    document.addEventListener('keydown', fv._diffCounterDismiss);
  }, DIFF_COUNTER_DISMISS_DELAY_MS);
}

function jumpToDiff(direction) {
  var hunks = getDiffHunks();
  if (hunks.length === 0) return;
  fv.currentDiffIdx += direction;
  if (fv.currentDiffIdx >= hunks.length) fv.currentDiffIdx = 0;
  if (fv.currentDiffIdx < 0) fv.currentDiffIdx = hunks.length - 1;
  document.querySelectorAll('.code-line.diff-focus').forEach(function(el) { el.classList.remove('diff-focus'); });
  var hunk = hunks[fv.currentDiffIdx];
  var allLines = Array.from(hunk.closest('.code-lines').querySelectorAll('.code-line'));
  var startIdx = allLines.indexOf(hunk);
  for (var i = startIdx; i < allLines.length; i++) {
    if (allLines[i].classList.contains('diff-added') || allLines[i].classList.contains('diff-removed')) {
      allLines[i].classList.add('diff-focus');
    } else break;
  }
  hunk.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showDiffCounter();
}

function toggleDiffCollapse() {
  var panel = document.querySelector('.fv-tab-content.active');
  if (!panel) return;
  var previewView = panel.querySelector('.fv-preview-view');
  if (previewView && previewView.style.display !== 'none') return;
  var hasDiffs = panel.querySelector('.code-line.diff-added, .code-line.diff-removed');
  if (!hasDiffs) return;
  var totalLines = panel.querySelectorAll('.code-line:not(.diff-removed)').length;
  var addedLines = panel.querySelectorAll('.code-line.diff-added').length;
  if (totalLines > 0 && addedLines === totalLines) return;
  var codeBlocks = panel.querySelectorAll('pre, .code-lines');
  codeBlocks.forEach(function(block) { block.style.transition = 'opacity 0.06s ease-out'; block.style.opacity = '0'; });
  setTimeout(function() {
    panel.classList.toggle('diff-collapsed');
    codeBlocks.forEach(function(block) { block.style.transition = 'opacity 0.08s ease-in'; block.style.opacity = '1'; });
    setTimeout(function() { codeBlocks.forEach(function(block) { block.style.transition = ''; }); }, SWAP_FADE_IN_MS);
  }, SWAP_FADE_OUT_MS);
}

function initDiffCollapseOn(root) {
  var panels = root.querySelectorAll('.fv-tab-content');
  panels.forEach(function(panel) {
    if (panel.querySelector('.code-line.diff-added, .code-line.diff-removed')) {
      markDiffContext(panel);
      panel.classList.add('diff-collapsed');
    }
  });
}
