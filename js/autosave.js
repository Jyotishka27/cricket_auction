function autoSaveState() {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
    category: state.category,
    pools: state.pools,
    skipped: state.skipped,
    current: state.current,
    teams: state.teams,
    sales: state.sales,
    savedAt: new Date().toISOString()
  }));
}

function restoreAutoSavedState() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return false;

  Object.assign(state, JSON.parse(raw), {
    timer: { handle: null, left: 0, running: false }
  });

  return true;
}
