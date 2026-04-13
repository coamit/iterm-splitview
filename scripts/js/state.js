// state.js — window.fv namespace with all shared mutable state
window.fv = {
  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  pendingCloses: 0,
  lastCloseCompleted: 0,
  lastOpenTriggered: 0,
  pageLoadTime: Date.now(),
  currentThemeId: '',
  currentSettingsSection: 'appearance',
  loadingGroups: {},
  groupLastTab: {},
  isSwapInProgress: false,
  lastOpenedFilePath: '',
  currentDiffIdx: -1,
  modalSelectedIdx: 0,
  modalItems: [],
  modalMode: 'files',
  searchTimer: null,
  currentSearchRoot: '',
  fileSearchAbort: null,
  fileSearchQuery: '',
  searchGeneration: 0,
  pollers: {
    loading: { id: null, xhr: null },
    reload: { id: null, xhr: null },
    timestamp: { id: null, xhr: null }
  },
  // DOM refs (set during init)
  themeStyleEl: null,
  loadingToast: null,
  diffCounterBadge: null,
  toastEl: null,
  tsEl: null,
  tsGenEpoch: 0,
  genTime: null,
  tabCount: 0,
  // Settings DOM refs
  settingsOverlay: null,
  themeGrid: null,
  settingsSectionTitle: null,
  gitWatchOverlay: null,
  gitWatchInput: null,
  gitWatchBtn: null,
  gitWatchStatus: null,
  gitModeBranch: null,
  gitModeLocal: null,
  // Modal DOM refs
  modalOverlay: null,
  modalInput: null,
  modalList: null,
  modalModeEl: null,
  modalModeText: null,
  modalRootEl: null,
  // Diff counter dismiss handler
  _diffCounterDismiss: null
};
var fv = window.fv;
