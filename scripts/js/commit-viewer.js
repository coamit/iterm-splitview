// commit-viewer.js — Commit selector dropdown for git change groups
var fv = window.fv;

var COMMIT_FETCH_LIMIT = 15;

function getRepoNameFromGroup(groupName) {
  if (groupName.indexOf('git.') !== 0) return '';
  return groupName.substring(4);
}

function fetchCommits(repoName, callback) {
  fetch('/_git-commits?repo=' + encodeURIComponent(repoName) + '&limit=' + COMMIT_FETCH_LIMIT)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      fv.commitCache[repoName] = data.commits || [];
      if (callback) callback(data.commits || []);
    })
    .catch(function() {
      if (callback) callback([]);
    });
}

function selectCommit(repoName, commitHash) {
  var endpoint = '/_git-select-commit?repo=' + encodeURIComponent(repoName);
  if (commitHash) {
    endpoint += '&commit=' + encodeURIComponent(commitHash);
  } else {
    endpoint += '&commit=working-tree';
  }
  var groupName = 'git.' + repoName;
  showGroupLoading(groupName, commitHash ? 'commit ' + commitHash.substring(0, 7) : repoName + ' changes');
  fv.lastOpenTriggered = 0;
  fv.selectedCommits[repoName] = commitHash || null;
  updateCommitIndicator(repoName);
  fetch(endpoint);
}

function createCommitDropdown(repoName, commits) {
  // Remove existing dropdown
  closeCommitDropdown();

  var dropdown = document.createElement('div');
  dropdown.className = 'fv-commit-dropdown';
  dropdown.id = 'fv-commit-dropdown';

  var header = document.createElement('div');
  header.className = 'fv-commit-dropdown-header';
  header.textContent = 'Recent commits';
  dropdown.appendChild(header);

  var list = document.createElement('div');
  list.className = 'fv-commit-dropdown-list';

  // Working tree option (always first)
  var wtItem = document.createElement('div');
  wtItem.className = 'fv-commit-item';
  if (!fv.selectedCommits[repoName]) wtItem.classList.add('active');
  wtItem.innerHTML = '<span class="fv-commit-hash">&#9671;</span>' +
    '<span class="fv-commit-msg">Working tree</span>';
  wtItem.addEventListener('click', function(e) {
    e.stopPropagation();
    closeCommitDropdown();
    if (fv.selectedCommits[repoName]) {
      selectCommit(repoName, null);
    }
  });
  list.appendChild(wtItem);

  // Commit items
  commits.forEach(function(commit) {
    var item = document.createElement('div');
    item.className = 'fv-commit-item';
    if (fv.selectedCommits[repoName] === commit.hash) item.classList.add('active');
    item.innerHTML = '<span class="fv-commit-hash">' + escapeHtml(commit.short) + '</span>' +
      '<span class="fv-commit-msg">' + escapeHtml(commit.message) + '</span>' +
      '<span class="fv-commit-author">' + escapeHtml(commit.author) + '</span>';
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      closeCommitDropdown();
      selectCommit(repoName, commit.hash);
    });
    list.appendChild(item);
  });

  if (commits.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'fv-commit-empty';
    empty.textContent = 'No commits found';
    list.appendChild(empty);
  }

  dropdown.appendChild(list);
  document.body.appendChild(dropdown);
  fv.commitDropdownOpen = repoName;

  // Position dropdown near the commit button
  var btn = document.querySelector('.fv-commit-btn[data-repo="' + escapeHtml(repoName) + '"]');
  if (btn) {
    var rect = btn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = Math.max(4, rect.left - 160) + 'px';
  }

  // Close on outside click (deferred to avoid the current click event)
  setTimeout(function() {
    document.addEventListener('click', _commitDropdownOutsideClick);
    document.addEventListener('keydown', _commitDropdownEscapeHandler);
  }, 10);
}

function _commitDropdownOutsideClick(e) {
  var dropdown = document.getElementById('fv-commit-dropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    closeCommitDropdown();
  }
}

function _commitDropdownEscapeHandler(e) {
  if (e.key === 'Escape') {
    closeCommitDropdown();
    e.preventDefault();
    e.stopPropagation();
  }
}

function closeCommitDropdown() {
  var dropdown = document.getElementById('fv-commit-dropdown');
  if (dropdown) dropdown.remove();
  fv.commitDropdownOpen = null;
  document.removeEventListener('click', _commitDropdownOutsideClick);
  document.removeEventListener('keydown', _commitDropdownEscapeHandler);
}

function toggleCommitDropdown(repoName) {
  if (fv.commitDropdownOpen === repoName) {
    closeCommitDropdown();
    return;
  }
  // Fetch fresh commits then show dropdown
  fetchCommits(repoName, function(commits) {
    createCommitDropdown(repoName, commits);
  });
}

function updateCommitIndicator(repoName) {
  var groupName = 'git.' + repoName;
  var sel = document.querySelector('.fv-group-sel[data-group="' + groupName + '"]');
  if (!sel) return;
  var indicator = sel.querySelector('.fv-commit-indicator');
  var selectedCommit = fv.selectedCommits[repoName];
  if (selectedCommit) {
    var shortHash = selectedCommit.substring(0, 7);
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'fv-commit-indicator';
      // Insert before the close button
      var closeBtn = sel.querySelector('.fv-group-close');
      if (closeBtn) {
        sel.insertBefore(indicator, closeBtn);
      } else {
        sel.appendChild(indicator);
      }
    }
    indicator.textContent = shortHash;
    indicator.title = 'Viewing commit ' + shortHash;
  } else {
    if (indicator) indicator.remove();
  }
}

function addCommitButton(groupSel) {
  var group = groupSel.getAttribute('data-group');
  if (group.indexOf('git.') !== 0) return;
  var repoName = getRepoNameFromGroup(group);
  // Don't add if already exists
  if (groupSel.querySelector('.fv-commit-btn')) return;
  var btn = document.createElement('span');
  btn.className = 'fv-commit-btn';
  btn.setAttribute('data-repo', repoName);
  btn.title = 'Browse commits';
  btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="0" x2="8" y2="5" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="11" x2="8" y2="16" stroke="currentColor" stroke-width="1.5"/></svg>';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleCommitDropdown(repoName);
  });
  // Insert before close button
  var closeBtn = groupSel.querySelector('.fv-group-close');
  if (closeBtn) {
    groupSel.insertBefore(btn, closeBtn);
  } else {
    groupSel.appendChild(btn);
  }
}

function initCommitButtons() {
  document.querySelectorAll('.fv-group-sel[data-group^="git."]').forEach(function(sel) {
    addCommitButton(sel);
  });
}

// Restore selected commit state from server on page load
function restoreCommitState() {
  fetch('/_git-settings')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.selected_commits) {
        Object.keys(data.selected_commits).forEach(function(repoName) {
          fv.selectedCommits[repoName] = data.selected_commits[repoName];
          updateCommitIndicator(repoName);
        });
      }
    })
    .catch(function() { /* non-critical */ });
}
