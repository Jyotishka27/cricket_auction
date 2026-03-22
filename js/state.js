const state = {
  pools: { X: [], P: [], A: [], B: [], UNSOLD: [] },
  skipped: { X: [], P: [], A: [], B: [], UNSOLD: [] },
  category: 'X',
  current: null,
  teams: [],
  sales: [],
  timer: { handle: null, left: 0, running: false },
  ui: {
    activeMainTab: 'auction',
    activeAdminTab: 'budgets',
    rightPanelTab: 'budgets',
    playerManagementEditMode: false
  }
};
