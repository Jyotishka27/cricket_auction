(async function initAuction() {
  await loadAuctionData();

  const restored = restoreAutoSavedState();
  if (!restored) cloneData();

  wireEvents();
  renderAll();
})();
