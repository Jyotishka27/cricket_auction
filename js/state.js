const state = {
  pools: { X: [], P: [], A: [], B: [], UNSOLD: [] },
  skipped: { X: [], P: [], A: [], B: [], UNSOLD: [] },
  category: 'X',
  current: null,
  teams: [],
  sales: [],
  rules: {
    minPlayersPerTeam: 4,
    maxPlayersPerTeam: 5,
    pools: {
      X: { mandatory: true, min: 1, max: 2 },
      P: { mandatory: true, min: 1, max: 2 },
      A: { mandatory: true, min: 1, max: 2 },
      B: { mandatory: true, min: 1, max: 2 }
    }
  },
  timer: { handle: null, left: 0, running: false },
  ui: {
    activeMainTab: 'auction',
    activeAdminTab: 'budgets',
    rightPanelTab: 'budgets',
    playerManagementEditMode: false
  }
};
