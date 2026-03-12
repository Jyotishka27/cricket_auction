(async function initAuction() {

  await loadAuctionData();

  const restored = restoreAutoSavedState();

  if (restored) {
    console.log("Auction state restored from autosave.");
  }

  wireEvents();
  renderAll();

  // Auto save every 5 seconds
  setInterval(autoSaveState, 5000);

})();
