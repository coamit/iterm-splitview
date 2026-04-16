// revision-history.js — File revision history panel
var fv = window.fv;
var _revisionDebounceTimer = null;
var _revisionLoadingTimer = null;
var _revisionLoadingPollId = null;
// Safety timeout: generous upper bound so the spinner never gets permanently
// stuck. In practice, performSwap fires first and clears the spinner accurately.
// pandoc has a 10s shell timeout; ~15s covers regen + polling headroom.
var REVISION_POLL_SAFETY_TIMEOUT_MS = 15000;

// --- Panel DOM management ---

function _getOrCreatePanel() {
  var panel = document.getElementById('fv-revision-panel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'fv-revision-panel';
  panel.className = 'fv-revision-panel';
  panel.innerHTML =
    '<div class="fv-revision-header">' +
      '<span class="fv-revision-header-left">' +
        '<span class="fv-revision-title">History</span>' +
        '<span class="fv-revision-spinner" id="fv-revision-spinner"></span>' +
      '</span>' +
      '<span class="fv-revision-close" id="fv-revision-close-btn" title="Close">\u00d7</span>' +
    '</div>' +
    '<div class="fv-revision-list" id="fv-revision-list">' +
      '<div class="fv-revision-loading">Loading\u2026</div>' +
    '</div>';
  document.body.appendChild(panel);
  document.getElementById('fv-revision-close-btn').addEventListener('click', closeRevisionPanel);
  return panel;
}

function _setRevisionLoading(on) {
  var spinner = document.getElementById('fv-revision-spinner');
  if (spinner) spinner.classList.toggle('visible', !!on);
}

function openRevisionPanel() {
  var fp = getActiveFilePath();
  if (!fp) return;
  fv.revisionPanelOpen = true;
  fv.revisionFilePath = fp;
  var panel = _getOrCreatePanel();
  panel.classList.add('visible');
  _loadHistory(fp);
}

function closeRevisionPanel() {
  fv.revisionPanelOpen = false;
  var panel = document.getElementById('fv-revision-panel');
  if (panel) panel.classList.remove('visible');
}

function toggleRevisionPanel() {
  if (fv.revisionPanelOpen) {
    closeRevisionPanel();
  } else {
    openRevisionPanel();
  }
}

// --- History loading ---

function _loadHistory(filePath) {
  var list = document.getElementById('fv-revision-list');
  if (!list) return;
  list.innerHTML = '<div class="fv-revision-loading">Loading\u2026</div>';

  fetch('/_file-history?path=' + encodeURIComponent(filePath))
    .then(function(r) { return r.json(); })
    .then(function(commits) {
      _renderCommitList(list, filePath, commits);
    })
    .catch(function() {
      list.innerHTML = '<div class="fv-revision-empty">Could not load history</div>';
    });
}

function _renderCommitList(list, filePath, commits) {
  if (!commits || commits.length === 0) {
    list.innerHTML = '<div class="fv-revision-empty">No history found.<br>File may not be git-tracked.</div>';
    return;
  }

  var html = '';

  // "Live" entry — always at top, same two-row layout as commits
  var liveActive = !fv.revisionActiveCommit ? ' active' : '';
  html += '<div class="fv-revision-item fv-revision-live' + liveActive + '" data-commit="current">' +
    '<div class="fv-revision-row1">' +
      '<span class="fv-revision-hash">live</span>' +
    '</div>' +
    '<div class="fv-revision-subject">Current file</div>' +
  '</div>';

  commits.forEach(function(c) {
    var isActive = fv.revisionActiveCommit === c.full_hash ? ' active' : '';
    // data-commit holds the full hash for selection; escapeHtml on all fields
    // prevents XSS even when commit messages contain HTML special characters.
    html += '<div class="fv-revision-item' + isActive + '" data-commit="' + escapeHtml(c.full_hash) + '">' +
      '<div class="fv-revision-row1">' +
        '<span class="fv-revision-hash">' + escapeHtml(c.hash) + '</span>' +
        '<span class="fv-revision-ago">' + escapeHtml(c.ago) + '</span>' +
      '</div>' +
      '<div class="fv-revision-subject">' + escapeHtml(c.subject) + '</div>' +
    '</div>';
  });

  list.innerHTML = html;

  // Wire up click handlers with debounce
  list.querySelectorAll('.fv-revision-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var commit = item.getAttribute('data-commit');
      // Optimistic UI: mark active immediately
      list.querySelectorAll('.fv-revision-item').forEach(function(i) { i.classList.remove('active'); });
      item.classList.add('active');
      fv.revisionActiveCommit = (commit === 'current') ? null : commit;
      // Debounce: wait 300ms before triggering regen (in case user is rapidly clicking)
      if (_revisionDebounceTimer) clearTimeout(_revisionDebounceTimer);
      _revisionDebounceTimer = setTimeout(function() {
        _revisionDebounceTimer = null;
        _setRevisionLoading(true);
        _selectRevision(filePath, commit);
      }, 300);
    });
  });
}

function _selectRevision(filePath, commit) {
  // Reset genTime so pollReload always detects a change, even when the rendered
  // HTML hash is identical to the previously-seen hash (e.g. switching between
  // two different revisions that produce byte-identical output, or returning to
  // live when the live file hasn't changed since the last revision was loaded).
  // pollReload uses genTime as its primary "has anything changed" signal, so
  // nulling it guarantees at least one swap will fire after this selection.
  fv.genTime = null;
  // Start /_loading poll to keep spinner alive for exactly as long as regen runs
  _startRevisionLoadingPoll();
  fetch('/_file-revision?path=' + encodeURIComponent(filePath) + '&commit=' + encodeURIComponent(commit))
    .catch(function() {
      // Network or server error — stop spinner and notify user
      _finalizeRevisionLoading();
      showToast('Failed to load revision \u2014 server error');
    });
}

function _startRevisionLoadingPoll() {
  _stopRevisionLoadingPoll();
  // Safety fallback: clear spinner if performSwap never fires (e.g. live view
  // already at current hash, or regen failure). REVISION_POLL_SAFETY_TIMEOUT_MS
  // is generous enough not to fire before any realistic regen completes.
  if (_revisionLoadingTimer) clearTimeout(_revisionLoadingTimer);
  _revisionLoadingTimer = setTimeout(function() {
    _revisionLoadingTimer = null;
    _finalizeRevisionLoading();
  }, REVISION_POLL_SAFETY_TIMEOUT_MS);
  // Poll /_loading every 500ms while regen is running.
  // The spinner is cleared precisely by performSwap → finalizeRevisionLoading
  // when the new content actually hits the DOM — never early, never late.
  _revisionLoadingPollId = setInterval(function() {
    fetch('/_loading').then(function(r) { return r.json(); }).then(function(data) {
      if (!data.loading) _stopRevisionLoadingPoll();
    }).catch(function() { _stopRevisionLoadingPoll(); });
  }, 500);
}

function _stopRevisionLoadingPoll() {
  if (_revisionLoadingPollId) { clearInterval(_revisionLoadingPollId); _revisionLoadingPollId = null; }
}

// Shared teardown: stop poll, cancel safety timeout, hide spinner.
// Called from both performSwap (success path) and error/timeout paths.
function _finalizeRevisionLoading() {
  _stopRevisionLoadingPoll();
  if (_revisionLoadingTimer) { clearTimeout(_revisionLoadingTimer); _revisionLoadingTimer = null; }
  _setRevisionLoading(false);
}

// --- Revision badge in file header ---

// Called after every performSwap — adds revision badges to the header when a
// revision is active, and finalizes loading state (stops poll, clears spinner).
// Responsibilities: (1) badge insertion, (2) stop loading poll, (3) hide spinner.
function finalizeRevisionLoading() {
  document.querySelectorAll('.code-file-wrapper[data-revision]').forEach(function(wrapper) {
    var hash = wrapper.getAttribute('data-revision');
    if (!hash) return;
    var header = wrapper.querySelector('.code-file-header');
    if (!header) return;
    var fname = header.querySelector('.filename');
    if (fname && !fname.querySelector('.fv-rev-badge')) {
      var badge = document.createElement('span');
      badge.className = 'fv-rev-badge';
      badge.textContent = '@' + hash.slice(0, 7);
      fname.appendChild(badge);
    }
  });
  _finalizeRevisionLoading();
}

// Closes the history panel when the user switches to a different file tab.
// Named for what it does (close), not what it used to do (refresh).
function onTabSwitchCloseRevisionPanel() {
  if (!fv.revisionPanelOpen) return;
  var fp = getActiveFilePath();
  if (fp && fp !== fv.revisionFilePath) {
    closeRevisionPanel();
  }
}
