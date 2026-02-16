(async function initAuction() {
  await loadAuctionData();

  const restored = restoreAutoSavedState();

  wireEvents();
  renderAll();
})();
