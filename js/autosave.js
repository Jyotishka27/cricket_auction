// use the global AUTOSAVE_KEY from config.js

function autoSaveState() {
  const payload = {
    category: state.category,
    pools: state.pools,
    skipped: state.skipped,
    current: state.current,
    teams: state.teams,
    sales: state.sales,
    ui: state.ui,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));

  if (window.saveAuctionToCloud) {
    window.saveAuctionToCloud();
  }
}

function restoreAutoSavedState() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);

    Object.assign(state, {
      category: parsed.category ?? 'X',
      pools: parsed.pools ?? { X: [], P: [], A: [], B: [], UNSOLD: [] },
      skipped: parsed.skipped ?? { X: [], P: [], A: [], B: [], UNSOLD: [] },
      current: parsed.current ?? null,
      teams: parsed.teams ?? [],
      sales: parsed.sales ?? [],
      ui: parsed.ui ?? {
        activeMainTab: 'auction',
        activeAdminTab: 'budgets',
        rightPanelTab: 'budgets',
        playerManagementEditMode: false
      },
      timer: { handle: null, left: 0, running: false }
    });

    return true;
  } catch (err) {
    console.error('Failed to restore autosaved state:', err);
    return false;
  }
}
