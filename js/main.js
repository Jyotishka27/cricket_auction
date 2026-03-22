(async function initAuction() {
  await loadAuctionData();

  let restored = false;

  try {
    if (window.loadAuctionFromCloud) {
      restored = await window.loadAuctionFromCloud();
    }
  } catch (err) {
    console.warn('Cloud restore skipped:', err);
  }

  if (!restored) {
    restoreAutoSavedState();
  }

  wireEvents();
  renderAll();

  window.addEventListener('beforeunload', autoSaveState);
})();
