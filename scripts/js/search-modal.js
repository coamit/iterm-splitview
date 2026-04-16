// search-modal.js — Fuzzy matching, search modals, modal rendering, file/text search
var fv = window.fv;

function fuzzyMatch(text, query) {
  var textLower = text.toLowerCase();
  var queryLower = query.toLowerCase();
  var queryIdx = 0;
  for (var textIdx = 0; textIdx < textLower.length && queryIdx < queryLower.length; textIdx++) {
    if (textLower[textIdx] === queryLower[queryIdx]) queryIdx++;
  }
  return queryIdx === queryLower.length;
}

function fuzzyHighlight(text, query) {
  var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!query) return escaped;
  var queryLower = query.toLowerCase();
  var result = '';
  var queryIdx = 0;
  var i;
  for (i = 0; i < escaped.length && queryIdx < queryLower.length; i++) {
    if (escaped[i].toLowerCase() === queryLower[queryIdx]) {
      result += '<mark>' + escaped[i] + '</mark>';
      queryIdx++;
    } else {
      result += escaped[i];
    }
  }
  return result + escaped.slice(i);
}

function getTabData() {
  var tabs = document.querySelectorAll('.fv-tab[data-tab]');
  var data = [];
  tabs.forEach(function(tab) {
    var title = tab.getAttribute('title') || '';
    var filename = title.split('/').pop();
    var filepath = title;
    data.push({ tabId: tab.getAttribute('data-tab'), filename: filename, filepath: filepath });
  });
  return data;
}

function getOpenFilePaths() {
  var paths = {};
  document.querySelectorAll('.fv-tab[data-tab]').forEach(function(tab) {
    var fp = (tab.getAttribute('title') || '').toLowerCase();
    if (fp) paths[fp] = true;
  });
  return paths;
}

// eslint-disable-next-line max-lines-per-function
function searchText(query, activeOnly) {
  if (!query || query.length < SEARCH_MIN_QUERY_LEN) return [];
  var results = [];
  var queryLower = query.toLowerCase();
  var tabs = getTabData();
  var tabMap = {};
  tabs.forEach(function(tabData) { tabMap[tabData.tabId] = tabData; });
  var panels = activeOnly
    ? [document.querySelector('.fv-tab-content.active')].filter(Boolean)
    : document.querySelectorAll('.fv-tab-content');
  panels.forEach(function(panel) {
    var tabId = panel.id;
    var tab = tabMap[tabId];
    if (!tab) return;
    var lines = panel.querySelectorAll('.code-line');
    lines.forEach(function(line) {
      if (results.length >= SEARCH_RESULTS_LIMIT) return;
      var lc = line.querySelector('.lc');
      if (!lc) return;
      var text = lc.textContent;
      if (fuzzyMatch(text, queryLower)) {
        var ln = line.querySelector('.ln');
        var lineNum = ln ? ln.textContent.trim() : '?';
        results.push({ tabId: tabId, filename: tab.filename, lineNum: lineNum, lineEl: line, content: text });
      }
    });
    var markdownElements = panel.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, a, strong, em, code:not(.code-line code)');
    var seen = new Set();
    markdownElements.forEach(function(el) {
      if (results.length >= SEARCH_RESULTS_LIMIT) return;
      if (el.closest('.code-line') || el.closest('.code-file-header')) return;
      var text = el.textContent;
      if (seen.has(text)) return;
      seen.add(text);
      if (fuzzyMatch(text, queryLower)) {
        results.push({ tabId: tabId, filename: tab.filename, lineNum: '\u2014', lineEl: el, content: text.substring(0, 200) });
      }
    });
  });
  results.sort(function(first, second) {
    var al = first.content.toLowerCase(), bl = second.content.toLowerCase();
    var aExact = al.indexOf(queryLower) !== -1 ? 1 : 0;
    var bExact = bl.indexOf(queryLower) !== -1 ? 1 : 0;
    return bExact - aExact;
  });
  return results;
}

function showModalLoading() {
  fv.modalList.innerHTML = '<li class="fv-modal-loading">Searching</li>';
}

function renderEmptyState(msg) {
  return '<li class="fv-modal-empty">' + msg + '</li>';
}

function getRelativePath(fullPath) {
  if (fv.currentSearchRoot && fullPath.indexOf(fv.currentSearchRoot) === 0) {
    var rel = fullPath.slice(fv.currentSearchRoot.length);
    if (rel.charAt(0) === '/') rel = rel.slice(1);
    return rel;
  }
  return fullPath;
}

function renderFileSearchItem(item, i) {
  var cls = 'fv-modal-item' + (i === fv.modalSelectedIdx ? ' selected' : '');
  var rel = getRelativePath(item.filepath);
  var dir = rel.lastIndexOf('/') >= 0 ? rel.slice(0, rel.lastIndexOf('/')) : '';
  var filename = fv.fileSearchQuery ? fuzzyHighlight(item.filename, fv.fileSearchQuery) : escapeHtml(item.filename);
  return '<li class="' + cls + '" data-idx="' + i + '"><span class="fv-modal-fname">' +
    filename + '</span>' + (dir ? '<span class="fv-modal-fpath">' + escapeHtml(dir) + '</span>' : '') + '</li>';
}

function renderShortcutsModal(query) {
  var filtered = query ? shortcutsList.filter(function(s) {
    return fuzzyMatch(s.key, query) || fuzzyMatch(s.desc, query);
  }) : shortcutsList;
  fv.modalItems = [];
  fv.modalList.innerHTML = filtered.length ? filtered.map(function(s) {
    return '<li class="fv-modal-item shortcut-item">' +
      '<span class="fv-shortcut-key">' + (query ? fuzzyHighlight(s.key, query) : s.key) + '</span>' +
      '<span class="fv-shortcut-desc">' + (query ? fuzzyHighlight(s.desc, query) : s.desc) + '</span></li>';
  }).join('') : renderEmptyState('No matching shortcuts');
}

function renderTextSearchModal(query) {
  if (!query || query.length < SEARCH_MIN_QUERY_LEN) { fv.modalItems = []; fv.modalList.innerHTML = renderEmptyState('Type to search\u2026'); return; }
  var results = searchText(query, fv.modalMode === 'text-active');
  fv.modalItems = results;
  fv.modalSelectedIdx = Math.min(fv.modalSelectedIdx, Math.max(0, fv.modalItems.length - 1));
  fv.modalList.innerHTML = fv.modalItems.length ? fv.modalItems.map(function(item, i) {
    var cls = 'fv-modal-item text-result' + (i === fv.modalSelectedIdx ? ' selected' : '');
    var highlighted = fuzzyHighlight(item.content, query);
    return '<li class="' + cls + '" data-idx="' + i + '">' +
      '<span class="fv-modal-fname">' + item.filename + '<span class="fv-modal-line">:' + item.lineNum + '</span></span>' +
      '<span class="fv-modal-content">' + highlighted.trim() + '</span></li>';
  }).join('') : renderEmptyState('No results');
}

function getGroupData() {
  var groups = [];
  document.querySelectorAll('.fv-group-sel').forEach(function(sel) {
    var group = sel.getAttribute('data-group');
    var label = sel.textContent.replace(/\d+$/, '').replace(/\u00d7$/, '').trim();
    var count = sel.querySelector('.fv-group-count');
    groups.push({ group: group, label: label, count: count ? count.textContent : '0', isGroup: true });
  });
  return groups;
}

function renderFileSearchModal(query) {
  var tabs = getTabData();
  var groups = document.querySelector('.fv-group-bar') ? getGroupData() : [];

  var filteredGroups = query ? groups.filter(function(grp) {
    return fuzzyMatch(grp.label, query) || fuzzyMatch(grp.group, query);
  }) : groups;
  var filteredTabs = query ? tabs.filter(function(tabData) {
    return fuzzyMatch(tabData.filename, query) || fuzzyMatch(tabData.filepath, query);
  }) : tabs;

  fv.modalItems = [];
  filteredGroups.forEach(function(grp) { fv.modalItems.push(grp); });
  filteredTabs.forEach(function(tabData) { fv.modalItems.push(tabData); });

  fv.modalSelectedIdx = Math.min(fv.modalSelectedIdx, Math.max(0, fv.modalItems.length - 1));
  fv.modalList.innerHTML = fv.modalItems.length ? fv.modalItems.map(function(item, i) {
    var cls = 'fv-modal-item' + (i === fv.modalSelectedIdx ? ' selected' : '');
    if (item.isGroup) {
      return '<li class="' + cls + '" data-idx="' + i + '"><span class="fv-modal-fname" style="color:#a78bfa">' +
        (query ? fuzzyHighlight(item.label, query) : escapeHtml(item.label)) + '</span><span class="fv-group-count">' + item.count + '</span></li>';
    }
    return '<li class="' + cls + '" data-idx="' + i + '"><span class="fv-modal-fname">' +
      (query ? fuzzyHighlight(item.filename, query) : item.filename) + '</span><span class="fv-modal-fpath">' + item.filepath + '</span></li>';
  }).join('') : renderEmptyState(query ? 'No matching tabs' : 'No tabs open');
}

function renderTextSearchItem(item, i, queryLower) {
  var cls = 'fv-modal-item text-result' + (i === fv.modalSelectedIdx ? ' selected' : '');
  var escapedContent = item.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (queryLower) {
    var highlightRegex = new RegExp('(' + queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    escapedContent = escapedContent.replace(highlightRegex, '<mark>$1</mark>');
  }
  return '<li class="' + cls + '" data-idx="' + i + '">' +
    '<span class="fv-modal-fname">' + escapeHtml(item.fname) + '<span class="fv-modal-line">:' + item.line + '</span></span>' +
    '<span class="fv-modal-content">' + escapedContent.trim() + '</span></li>';
}

function handleSearchError(err) {
  if (err && err.name === 'AbortError') return;
  fvLogError('search_error', { message: err && err.message || String(err) });
  fv.modalItems = [];
  fv.modalList.innerHTML = renderEmptyState('Search failed');
}

function fetchTextSearch(query) {
  if (fv.fileSearchAbort) fv.fileSearchAbort.abort();
  if (!query || query.length < SEARCH_MIN_QUERY_LEN) { fv.modalItems = []; fv.modalList.innerHTML = renderEmptyState('Type to search\u2026'); return; }
  showModalLoading();
  fv.fileSearchAbort = new AbortController();
  var gen = ++fv.searchGeneration;
  var queryLower = query.toLowerCase();
  fetch('/_search-text?q=' + encodeURIComponent(query) + '&limit=' + SEARCH_RESULTS_LIMIT, { signal: fv.fileSearchAbort.signal })
    .then(function(res) { return res.json(); })
    .then(function(results) {
      if (gen !== fv.searchGeneration) return;
      var openPaths = getOpenFilePaths();
      fv.modalItems = results.filter(function(item) {
        return !openPaths[item.file.toLowerCase()];
      });
      fv.modalSelectedIdx = Math.min(fv.modalSelectedIdx, Math.max(0, fv.modalItems.length - 1));
      fv.modalList.innerHTML = fv.modalItems.length ? fv.modalItems.map(function(item, i) {
        return renderTextSearchItem(item, i, queryLower);
      }).join('') : renderEmptyState('No results');
    })
    .catch(handleSearchError);
}

function fetchFileSearch(query) {
  if (fv.fileSearchAbort) fv.fileSearchAbort.abort();
  showModalLoading();
  fv.fileSearchQuery = query || '';
  fv.fileSearchAbort = new AbortController();
  var gen = ++fv.searchGeneration;
  fetch('/_search-files?q=' + encodeURIComponent(query) + '&limit=' + SEARCH_RESULTS_LIMIT, { signal: fv.fileSearchAbort.signal })
    .then(function(res) { return res.json(); })
    .then(function(results) {
      if (gen !== fv.searchGeneration) return;
      var openPaths = getOpenFilePaths();
      fv.modalItems = results.map(function(item) {
        return { file: item.file, filename: item.fname, filepath: item.fpath };
      }).filter(function(item) {
        return !openPaths[item.file.toLowerCase()];
      });
      fv.modalSelectedIdx = Math.min(fv.modalSelectedIdx, Math.max(0, fv.modalItems.length - 1));
      fv.modalList.innerHTML = fv.modalItems.length ? fv.modalItems.map(renderFileSearchItem).join('')
        : renderEmptyState('No results');
    })
    .catch(handleSearchError);
}

function renderSearchModal(query) {
  if (fv.modalMode === 'shortcuts') return renderShortcutsModal(query);
  if (fv.modalMode === 'fs-text') return fetchTextSearch(query);
  if (fv.modalMode === 'fs-files') return fetchFileSearch(query);
  if (fv.modalMode === 'text' || fv.modalMode === 'text-active') return renderTextSearchModal(query);
  renderFileSearchModal(query);
}

var shortcutsList = [
  { key: 'Ctrl+F', desc: 'Find text in current tab' },
  { key: 'Ctrl+G', desc: 'Find text in all open tabs' },
  { key: 'Ctrl+H', desc: 'Find text and open file' },
  { key: 'Ctrl+O', desc: 'Open file by name' },
  { key: 'Ctrl+P', desc: 'Find tab by name' },
  { key: 'Ctrl+D', desc: 'Jump to next diff' },
  { key: 'Ctrl+X', desc: 'Toggle collapsed/expanded diff' },
  { key: 'Ctrl+E', desc: 'Toggle raw/preview (markdown)' },
  { key: 'Ctrl+C', desc: 'Copy file path' },
  { key: 'Ctrl+J', desc: 'Open file in Cursor' },
  { key: 'Ctrl+K', desc: 'Open workspace in Cursor' },
  { key: 'Ctrl+]', desc: 'Next tab' },
  { key: 'Ctrl+[', desc: 'Previous tab' },
  { key: 'Ctrl+W', desc: 'Close tab' },
  { key: 'Ctrl+I', desc: 'Watch repository' },
  { key: 'Ctrl+/', desc: 'Settings' },
  { key: 'Esc', desc: 'Close dialog' }
];

var modalModeConfig = {
  'fs-text':     { placeholder: 'Find text and open...',     label: '<span style="color:#ffcc66">Find &amp; Open</span> \u00b7 Ctrl+O to open file' },
  'fs-files':    { placeholder: 'Open file...',             label: '<span style="color:#ffcc66">Open</span> \u00b7 Ctrl+H to find text' },
  'files':       { placeholder: 'Find tab...',              label: '<span style="color:#ffcc66">Tabs</span> \u00b7 Ctrl+F to find text' },
  'text':        { placeholder: 'Find in all tabs...',      label: '<span style="color:#ffcc66">All Tabs</span> \u00b7 Ctrl+F for current tab' },
  'text-active': { placeholder: 'Find in current tab...',   label: '<span style="color:#ffcc66">Current Tab</span> \u00b7 Ctrl+G for all tabs' },
  'shortcuts':   { placeholder: 'Filter shortcuts...',       label: 'Keyboard Shortcuts' }
};

function isFilesystemMode(mode) { return mode === 'fs-text' || mode === 'fs-files'; }

function updateSearchRootDisplay() {
  if (!isFilesystemMode(fv.modalMode)) {
    fv.modalRootEl.style.display = 'none';
    return;
  }
  fv.modalRootEl.style.display = '';
  fv.modalRootEl.textContent = fv.currentSearchRoot || '~';
  fv.modalRootEl.title = 'Search root: ' + (fv.currentSearchRoot || '~') + ' (click to change)';
}

function fetchSearchRoot() {
  fetch('/_search-root')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      fv.currentSearchRoot = data.root;
      updateSearchRootDisplay();
    })
    .catch(function() { /* non-critical */ });
}

function startEditSearchRoot() {
  var input = document.createElement('input');
  input.className = 'fv-modal-root-input';
  input.value = fv.currentSearchRoot || '';
  input.placeholder = '~/path/to/project';
  fv.modalRootEl.style.display = 'none';
  fv.modalRootEl.parentNode.appendChild(input);
  input.focus();
  input.select();
  function commit() {
    var val = input.value.trim();
    if (val && val !== fv.currentSearchRoot) {
      fetch('/_search-root?path=' + encodeURIComponent(val))
        .then(function(res) { return res.json(); })
        .then(function(data) {
          fv.currentSearchRoot = data.root;
          updateSearchRootDisplay();
        });
    }
    input.remove();
    fv.modalRootEl.style.display = '';
    fv.modalInput.focus();
  }
  input.addEventListener('keydown', function(e) {
    // Stop all key events from reaching the global shortcut handler
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); input.remove(); fv.modalRootEl.style.display = ''; fv.modalInput.focus(); }
  });
  input.addEventListener('blur', commit);
}

function deriveSearchRootFromActiveFile() {
  var activePath = getActiveFilePath();
  if (!activePath) return false;
  var dir = activePath.substring(0, activePath.lastIndexOf('/'));
  if (!dir) return false;
  fv.currentSearchRoot = dir;
  updateSearchRootDisplay();
  // Sync the server-side root so subsequent searches use it
  fetch('/_search-root?path=' + encodeURIComponent(dir))
    .catch(function(err) { fvLogError('search_root_sync', { message: err && err.message || String(err) }); });
  return true;
}

function openSearchModal(mode) {
  fv.modalMode = mode || 'files';
  fv.modalInput.value = '';
  fv.modalSelectedIdx = 0;
  fv.modalItems = [];
  if (fv.fileSearchAbort) { fv.fileSearchAbort.abort(); fv.fileSearchAbort = null; }
  clearTimeout(fv.searchTimer);
  var cfg = modalModeConfig[fv.modalMode] || modalModeConfig['files'];
  fv.modalInput.style.display = '';
  fv.modalInput.placeholder = cfg.placeholder;
  fv.modalModeText.innerHTML = cfg.label;
  if (isFilesystemMode(fv.modalMode)) {
    if (!deriveSearchRootFromActiveFile()) {
      fetchSearchRoot();
    }
  }
  updateSearchRootDisplay();
  renderSearchModal('');
  fv.modalOverlay.classList.add('visible');
  setTimeout(function() { fv.modalInput.focus(); }, MODAL_FOCUS_DELAY_MS);
}

function closeSearchModal() {
  clearTimeout(fv.searchTimer);
  fv.searchGeneration++;
  if (fv.fileSearchAbort) { fv.fileSearchAbort.abort(); fv.fileSearchAbort = null; }
  fv.modalItems = [];
  fv.modalList.innerHTML = '';
  fv.modalOverlay.classList.remove('visible');
}

function toggleSearchModal(mode) {
  if (fv.modalOverlay.classList.contains('visible') && fv.modalMode === mode) closeSearchModal();
  else { fvLog('search_open', { mode: mode }); openSearchModal(mode); }
}

function highlightLineUntilDismiss(lineEl) {
  lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  lineEl.classList.add('search-highlight');
  function clear() {
    document.querySelectorAll('.search-highlight').forEach(function(el) { el.classList.remove('search-highlight'); });
    document.removeEventListener('click', clear);
    document.removeEventListener('keydown', clear);
  }
  setTimeout(function() {
    document.addEventListener('click', clear, { once: true });
    document.addEventListener('keydown', clear, { once: true });
  }, HIGHLIGHT_DISMISS_DELAY_MS);
}

function updateModalSelection() {
  var items = fv.modalList.querySelectorAll('.fv-modal-item');
  items.forEach(function(el, i) {
    el.classList.toggle('selected', i === fv.modalSelectedIdx);
  });
  var sel = fv.modalList.querySelector('.fv-modal-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function selectModalItem() {
  if (fv.modalItems.length === 0) return;
  var item = fv.modalItems[fv.modalSelectedIdx];
  if (item.isGroup) {
    closeSearchModal();
    switchTabGroup(item.group);
    var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
    if (first) {
      activateTab(first.getAttribute('data-tab'));
      history.replaceState(null, '', '#' + first.getAttribute('data-tab'));
    }
    return;
  }
  if (fv.modalMode === 'fs-text' || fv.modalMode === 'fs-files') {
    var filePath = item.file;
    fvLog('search_select', { mode: fv.modalMode, file: filePath });
    closeSearchModal();
    createLoadingTab(filePath);
    fv.lastOpenTriggered = Date.now();
    fetch('/_open?path=' + encodeURIComponent(filePath));
    return;
  }
  var wasText = fv.modalMode === 'text' || fv.modalMode === 'text-active';
  activateTab(item.tabId);
  history.replaceState(null, '', '#' + item.tabId);
  closeSearchModal();
  if (wasText && item.lineEl) {
    setTimeout(function() { highlightLineUntilDismiss(item.lineEl); }, MODAL_FOCUS_DELAY_MS);
  }
  fv.currentDiffIdx = -1;
}

function toggleMdView() {
  var panel = document.querySelector('.fv-tab-content.active');
  if (!panel) return;
  var toggle = panel.querySelector('.fv-md-toggle');
  if (!toggle) return;
  var otherBtn = toggle.querySelector('.fv-md-toggle-btn:not(.active)');
  if (otherBtn) otherBtn.click();
}
