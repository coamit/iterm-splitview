// content-swap.js — Content initialization, view state save/restore, performSwap, polling infrastructure
var fv = window.fv;

// --- Reusable initialization: hljs + line numbers + diff attrs + mermaid prep ---
// eslint-disable-next-line max-lines-per-function
function initializeContent(root) {
  root.querySelectorAll('pre code').forEach(function(block) { // eslint-disable-line max-lines-per-function
    if (block.closest('pre.mermaid') || block.classList.contains('mermaid')) return;
    var plainText = block.textContent;
    var lang = (block.className.match(/language-(\S+)/) || block.className.match(/sourceCode\s+(\S+)/) || [])[1] || '';
    var highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(plainText, { language: lang }).value
      : plainText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var lines = highlighted.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    var html = lines.map(function(line, i) {
      return '<div class="code-line"><span class="ln" data-ln="' + (i + 1) + '"></span><span class="lc">' + (line || '\u00a0') + '</span></div>';
    }).join('');
    var wrapper = document.createElement('div');
    wrapper.className = 'code-lines';
    wrapper.innerHTML = html;
    var diffAdded = block.getAttribute('data-diff-added');
    var diffRemoved = block.getAttribute('data-diff-removed');
    if (diffAdded) {
      var addedSet = new Set(diffAdded.split(',').map(Number));
      wrapper.querySelectorAll('.code-line').forEach(function(line, i) {
        if (addedSet.has(i + 1)) line.classList.add('diff-added');
      });
    }
    if (diffRemoved) {
      try {
        var removedMap = JSON.parse(diffRemoved);
        var codeLines = wrapper.querySelectorAll('.code-line');
        var insertions = [];
        Object.keys(removedMap).forEach(function(afterLine) {
          var removedLines = removedMap[afterLine];
          var targetIdx = parseInt(afterLine, 10);
          var targetElement = codeLines[targetIdx] || null;
          removedLines.forEach(function(text) {
            var row = document.createElement('div');
            row.className = 'code-line diff-removed';
            row.innerHTML = '<span class="ln"></span><span class="lc">' + text + '</span>';
            insertions.push({ before: targetElement, el: row });
          });
        });
        insertions.reverse().forEach(function(ins) {
          if (ins.before) wrapper.insertBefore(ins.el, ins.before);
          else wrapper.appendChild(ins.el);
        });
      } catch(_e) { /* non-critical */ }
    }
    block.innerHTML = '';
    block.style.padding = '0';
    block.style.background = 'none';
    block.parentElement.style.padding = '0';
    block.appendChild(wrapper);
  });
  root.querySelectorAll('pre.mermaid').forEach(function(pre) {
    var div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = pre.textContent;
    pre.replaceWith(div);
  });
}

function saveViewState() {
  var activeTab = document.querySelector('.fv-tab.active');
  var isOnLoadingTab = activeTab && activeTab.classList.contains('loading');
  var activeTabPath = (isOnLoadingTab && fv.lastOpenedFilePath)
    ? fv.lastOpenedFilePath
    : (activeTab ? activeTab.getAttribute('title') : '');
  fv.lastOpenedFilePath = '';
  var activeGroupSelector = document.querySelector('.fv-group-sel.active');
  var activeGroup = activeGroupSelector ? activeGroupSelector.getAttribute('data-group') : 'files';
  var wasOnLoadingGroup = activeGroupSelector && fv.loadingGroups[activeGroup];
  return {
    scrollTop: window.scrollY,
    activeTabPath: activeTabPath,
    activeGroup: activeGroup,
    wasOnLoadingGroup: wasOnLoadingGroup
  };
}

function restoreViewState(container, state) {
  if (state.wasOnLoadingGroup) {
    switchTabGroup(state.activeGroup);
    var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
    if (first) activateTab(first.getAttribute('data-tab'));
  } else if (state.activeTabPath) {
    var restoredTab = container.querySelector('.fv-tab[title="' + escapeCssSelector(state.activeTabPath) + '"]');
    if (restoredTab) {
      var restoredGroup = restoredTab.getAttribute('data-group');
      if (restoredGroup && container.querySelector('.fv-group-bar')) {
        switchTabGroup(restoredGroup);
      }
      activateTab(restoredTab.getAttribute('data-tab'));
    } else {
      switchTabGroup(state.activeGroup);
      var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
      if (first) activateTab(first.getAttribute('data-tab'));
    }
  } else {
    var groupBar = container.querySelector('.fv-group-bar');
    if (groupBar) {
      var defGroup = container.querySelector('.fv-group-sel.active');
      if (defGroup) switchTabGroup(defGroup.getAttribute('data-group'));
    }
    var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]') || document.querySelector('.fv-tab[data-tab]');
    if (first) activateTab(first.getAttribute('data-tab'));
  }
  window.scrollTo(0, state.scrollTop);
}

function performSwap(newBodyHtml) {
  if (fv.isSwapInProgress) return;
  fv.isSwapInProgress = true;

  // 1. Save state
  var state = saveViewState();

  // 2. Prepare offscreen
  var offscreen = document.createElement('div');
  offscreen.innerHTML = newBodyHtml;
  initializeContent(offscreen);
  initializeDiffCollapse(offscreen);

  // 3. Swap into live DOM
  var container = document.getElementById('fv-body-container');
  container.innerHTML = offscreen.innerHTML;

  // 4. Attach event listeners to new content
  attachBodyListeners(container);

  // 4b. Clear resolved loading groups BEFORE tab restore
  updateGroupCounts();
  Object.keys(fv.loadingGroups).forEach(function(gn) {
    if (document.querySelectorAll('.fv-tab[data-group="' + gn + '"][data-tab]').length > 0) {
      var loadingPanel = document.getElementById(fv.loadingGroups[gn]);
      if (loadingPanel) loadingPanel.remove();
      delete fv.loadingGroups[gn];
    }
  });

  // 5. Restore active tab
  restoreViewState(container, state);

  // 6. Mermaid rendering (needs live DOM)
  var mermaidElements = container.querySelectorAll('.mermaid:not([data-processed])');
  if (mermaidElements.length > 0) {
    try { mermaid.run({ nodes: mermaidElements }); } catch(_e) { /* non-critical */ }
  }

  // 7. Ensure content visible
  var newActive = document.querySelector('.fv-tab-content.active');
  if (newActive) newActive.classList.add('fv-reveal');

  // 7b. Update revision badges; keep panel open only if it's for the current file
  updateRevisionBadges();
  if (fv.revisionPanelOpen) {
    var fp = getActiveFilePath();
    if (fp && fp !== fv.revisionFilePath) {
      closeRevisionPanel();
    }
  }

  // 8. Update metadata from new content
  var newMarker = container.querySelector('[data-fv-gen]');
  if (newMarker) {
    fv.genTime = newMarker.getAttribute('data-fv-gen');
    fv.tabCount = parseInt(newMarker.getAttribute('data-fv-tabs') || '0', 10);
    var newEpoch = parseInt(newMarker.getAttribute('data-fv-time') || '0', 10);
    if (newEpoch) fv.tsGenEpoch = newEpoch;
  }

  // 9. Hide loading indicators
  fv.loadingToast.style.display = 'none';
  fv.isSwapInProgress = false;
}

// --- Poller infrastructure ---
function abortPoller(name) {
  var poller = fv.pollers[name];
  if (poller.xhr) { poller.xhr.abort(); poller.xhr = null; }
}

function stopPoller(name) {
  var poller = fv.pollers[name];
  if (poller.id) { clearInterval(poller.id); poller.id = null; }
  abortPoller(name);
}

function stopAllPollers() {
  stopPoller('loading');
  stopPoller('reload');
  stopPoller('timestamp');
}

// --- Loading toast poller ---
function pollLoading() {
  abortPoller('loading');
  try {
    var xhr = new XMLHttpRequest();
    fv.pollers.loading.xhr = xhr;
    xhr.open('GET', '/_loading?t=' + Date.now(), true);
    xhr.onload = function() {
      fv.pollers.loading.xhr = null;
      try {
        var response = JSON.parse(xhr.responseText);
        var showIt = response.loading && fv.lastOpenTriggered === 0 && (Date.now() - fv.pageLoadTime) > PAGE_LOAD_GRACE_MS;
        fv.loadingToast.style.display = showIt ? 'flex' : 'none';
        if (!response.loading) stopPoller('loading');
      } catch(_e) { /* non-critical */ }
    };
    xhr.send();
  } catch(_e) { /* non-critical */ }
}

function startLoadingPoll() {
  if (fv.pollers.loading.id) return;
  fv.pollers.loading.id = setInterval(pollLoading, POLL_LOADING_INTERVAL);
}

// --- Auto-reload poller ---
// eslint-disable-next-line max-lines-per-function
function pollReload() {
  abortPoller('reload');
  if (fv.isSwapInProgress) return;
  try {
    var xhr = new XMLHttpRequest();
    fv.pollers.reload.xhr = xhr;
    xhr.open('GET', '/_gen?t=' + Date.now(), true);
    xhr.onload = function() {
      fv.pollers.reload.xhr = null;
      try {
        var response = JSON.parse(xhr.responseText);
        if (response.gen && response.gen !== fv.genTime) {
          var closeGuard = fv.pendingCloses > 0 || (Date.now() - fv.lastCloseCompleted) < CLOSE_GUARD_MS;
          if (closeGuard || (Date.now() - fv.pageLoadTime) < PAGE_LOAD_GRACE_MS) {
            if (closeGuard) fv.genTime = response.gen;
            return;
          }
          if (fv.lastOpenTriggered > 0) {
            if ((Date.now() - fv.lastOpenTriggered) < OPEN_TRIGGER_GUARD_MS) return;
            try {
              var loadingXhr = new XMLHttpRequest();
              loadingXhr.open('GET', '/_loading', false);
              loadingXhr.send();
              var loadingStatus = JSON.parse(loadingXhr.responseText);
              if (loadingStatus.loading) return;
            } catch(_e) { /* non-critical */ }
            fv.lastOpenTriggered = 0;
          }
          if (fv.isSwapInProgress) return;
          var fetchXhr = new XMLHttpRequest();
          fetchXhr.open('GET', '/index.html?t=' + Date.now(), true);
          fetchXhr.onload = function() {
            if (fetchXhr.status !== 200) return;
            var parser = new DOMParser();
            var doc = parser.parseFromString(fetchXhr.responseText, 'text/html');
            var newContainer = doc.getElementById('fv-body-container');
            if (newContainer) {
              performSwap(newContainer.innerHTML);
            }
          };
          fetchXhr.send();
        }
      } catch(_e) { /* non-critical */ }
    };
    xhr.send();
  } catch(_e) { /* non-critical */ }
}

function startReloadPoll() {
  var marker = document.querySelector('[data-fv-gen]');
  if (!marker || fv.pollers.reload.id) return;
  fv.pollers.reload.id = setInterval(pollReload, POLL_RELOAD_INTERVAL);
}

// --- Timestamp poller ---
function updateTimestamp() {
  if (!fv.tsEl) return;
  var diff = Math.floor(Date.now() / 1000) - fv.tsGenEpoch;
  var text;
  if (diff < 60) text = diff + 's ago';
  else if (diff < 3600) text = Math.floor(diff / 60) + 'm ago';
  else if (diff < 86400) text = Math.floor(diff / 3600) + 'h ago';
  else text = Math.floor(diff / 86400) + 'd ago';
  fv.tsEl.textContent = 'Updated ' + text;
}

function startTimestampPoll() {
  if (!fv.tsEl || fv.pollers.timestamp.id) return;
  updateTimestamp();
  fv.pollers.timestamp.id = setInterval(updateTimestamp, POLL_TIMESTAMP_INTERVAL);
}
