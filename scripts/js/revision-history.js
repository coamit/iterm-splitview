// revision-history.js — File revision history panel
var fv = window.fv;
var _revisionDebounceTimer = null;
var _revisionLoadingTimer = null;
var _revisionLoadingPollId = null;

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
    html += '<div class="fv-revision-item' + isActive + '" data-commit="' + escapeHtml(c.full_hash) + '" data-short="' + escapeHtml(c.hash) + '">' +
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
  // Reset genTime so pollReload always detects a change, even if content hash is identical
  fv.genTime = null;
  // Start /_loading poll to keep spinner alive for exactly as long as regen runs
  _startRevisionLoadingPoll();
  fetch('/_file-revision?path=' + encodeURIComponent(filePath) + '&commit=' + encodeURIComponent(commit));
}

function _startRevisionLoadingPoll() {
  _stopRevisionLoadingPoll();
  // Safety fallback: clear spinner after 30s if performSwap never fires
  if (_revisionLoadingTimer) clearTimeout(_revisionLoadingTimer);
  _revisionLoadingTimer = setTimeout(function() {
    _revisionLoadingTimer = null;
    _setRevisionLoading(false);
    _stopRevisionLoadingPoll();
  }, 30000);
  // Poll /_loading every 500ms while regen is running
  // Spinner clears via performSwap → updateRevisionBadges when content hits DOM
  _revisionLoadingPollId = setInterval(function() {
    fetch('/_loading').then(function(r) { return r.json(); }).then(function(data) {
      if (!data.loading) _stopRevisionLoadingPoll();
    }).catch(function() { _stopRevisionLoadingPoll(); });
  }, 500);
}

function _stopRevisionLoadingPoll() {
  if (_revisionLoadingPollId) { clearInterval(_revisionLoadingPollId); _revisionLoadingPollId = null; }
}

// --- Revision badge in file header ---

function updateRevisionBadges() {
  // Called after content swap — reads data-revision on wrappers and updates header display
  document.querySelectorAll('.code-file-wrapper[data-revision]').forEach(function(wrapper) {
    var hash = wrapper.getAttribute('data-revision');
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
  // Swap complete — stop poll, cancel safety timeout, clear spinner
  _stopRevisionLoadingPoll();
  if (_revisionLoadingTimer) { clearTimeout(_revisionLoadingTimer); _revisionLoadingTimer = null; }
  _setRevisionLoading(false);
}

// Refresh panel when active file changes (tab switch)
function onTabSwitchRefreshRevision() {
  if (!fv.revisionPanelOpen) return;
  var fp = getActiveFilePath();
  if (fp && fp !== fv.revisionFilePath) {
    closeRevisionPanel();
  }
}
