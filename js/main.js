(async function initAuction() {
  await loadAuctionData();

  let restored = false;

  if (window.loadAuctionFromCloud) {
    restored = await window.loadAuctionFromCloud();
  }

  if (!restored) {
    restoreAutoSavedState();
  }

  wireEvents();
  renderAll();

  window.addEventListener('beforeunload', autoSaveState);
})();
