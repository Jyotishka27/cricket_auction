import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_99fBDK1AD2qhoPsE2JIxsEvryYS3bg8",
  authDomain: "auction-62dee.firebaseapp.com",
  projectId: "auction-62dee",
  storageBucket: "auction-62dee.firebasestorage.app",
  messagingSenderId: "247719354344",
  appId: "1:247719354344:web:cad985da40408d3aa0ce5d",
  measurementId: "G-WXGLTSQZPY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const AUCTION_DOC = doc(db, "auctions", "default_auction");

function buildCloudPayload() {
  return {
    category: state.category,
    pools: state.pools,
    skipped: state.skipped,
    current: state.current,
    teams: state.teams,
    sales: state.sales,
    ui: state.ui,
    savedAt: new Date().toISOString()
  };
}

async function saveAuctionToCloud() {
  try {
    await setDoc(AUCTION_DOC, buildCloudPayload(), { merge: true });
    console.log("Firebase save successful");
    return true;
  } catch (err) {
    console.error("Firebase save failed:", err);
    return false;
  }
}

async function loadAuctionFromCloud() {
  try {
    const snapshot = await getDoc(AUCTION_DOC);

    if (!snapshot.exists()) {
      console.log("No Firebase auction document found");
      return false;
    }

    const parsed = snapshot.data();

    Object.assign(state, {
      category: parsed.category ?? "X",
      pools: parsed.pools ?? { X: [], P: [], A: [], B: [], UNSOLD: [] },
      skipped: parsed.skipped ?? { X: [], P: [], A: [], B: [], UNSOLD: [] },
      current: parsed.current ?? null,
      teams: parsed.teams ?? [],
      sales: parsed.sales ?? [],
      ui: parsed.ui ?? {
        activeMainTab: "auction",
        activeAdminTab: "budgets",
        rightPanelTab: "budgets",
        playerManagementEditMode: false
      },
      timer: { handle: null, left: 0, running: false }
    });

    console.log("Firebase load successful");
    return true;
  } catch (err) {
    console.error("Firebase load failed:", err);
    return false;
  }
}

window.saveAuctionToCloud = saveAuctionToCloud;
window.loadAuctionFromCloud = loadAuctionFromCloud;
