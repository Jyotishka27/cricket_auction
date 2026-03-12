// ===============================
// autosave.js
// ===============================

// Key used for storing autosave
const AUTOSAVE_KEY = "auction_autosave_v1";

// -------------------------------
// Save auction state automatically
// -------------------------------
function autoSaveState() {

  try {

    const snapshot = {
      category: state.category,
      pools: state.pools,
      skipped: state.skipped,
      current: state.current,
      teams: state.teams,
      sales: state.sales,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));

  } catch (err) {

    console.error("AutoSave failed:", err);

  }

}


// -------------------------------
// Restore autosaved auction state
// -------------------------------
function restoreAutoSavedState() {

  const raw = localStorage.getItem(AUTOSAVE_KEY);

  if (!raw) return false;

  try {

    const saved = JSON.parse(raw);

    // Basic validation
    if (!saved || !saved.category) return false;

    Object.assign(state, {
      category: saved.category,
      pools: saved.pools,
      skipped: saved.skipped,
      current: saved.current,
      teams: saved.teams,
      sales: saved.sales,
      timer: { handle: null, left: 0, running: false }
    });

    console.log("Autosave restored from:", saved.savedAt);

    return true;

  } catch (err) {

    console.error("Autosave restore failed:", err);
    return false;

  }

}
