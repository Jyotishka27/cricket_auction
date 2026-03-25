import { loadAuctionData } from "./storage.js";
import { restoreAutoSavedState, autoSaveState } from "./autosave.js";
import { wireEvents } from "./events.js";
import { renderAll } from "./renderer.js";

// (optional but recommended if you're adding upload feature)
import { uploadPlayers } from "./importExport.js";

(async function initAuction() {
  await loadAuctionData(); // 🔥 now loads from Firebase first, fallback JSON

  let restored = false;

  try {
    if (window.loadAuctionFromCloud) {
      restored = await window.loadAuctionFromCloud();
    }
  } catch (err) {
    console.warn("Cloud restore skipped:", err);
  }

  if (!restored) {
    restoreAutoSavedState();
  }

  wireEvents();
  renderAll();

  window.addEventListener("beforeunload", autoSaveState);

  console.log("✅ Auction initialized");
})();
