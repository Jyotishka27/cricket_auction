import { state } from './state.js';
import { autoSaveState } from './autosave.js';
import { renderAll, renderCurrent } from './renderer.js';
import { cancelTimer, startOrResetTimer } from './timer.js';
import { showWarn, applyUnsoldReduction } from './utils.js';
import { dom } from './renderer.js';

// ===============================
// Category handling
// ===============================
export function setCategory(cat) {
  if (state.timer.running && !confirm('Timer running! Switch category anyway?')) {
    return;
  }

  if (state.timer.running) {
    cancelTimer();
  }

  state.category = cat;
  autoSaveState();
  renderAll();
}

export function setRightPanelTab(tabName) {
  state.ui.rightPanelTab = tabName;
  autoSaveState();
  renderAll();
}

// ===============================
// Player selection
// ===============================
export function nextPlayer() {
  if (state.current) {
    const { player, category, bidder } = state.current;

    if (bidder === null) {
      state.pools[category].push(player);
    } else {
      state.skipped[category].push(player);
    }

    state.current = null;
    cancelTimer();
  }

  const pool = state.pools[state.category] || [];
  const skipped = state.skipped[state.category] || [];
  const merged = [...pool, ...skipped];

  if (!merged.length) {
    alert('No players left in this category.');
    return;
  }

  const idx = Math.floor(Math.random() * merged.length);
  const selected = merged[idx];

  const fromPool = pool.find(p => p.id === selected.id) ? pool : skipped;
  const rmIndex = fromPool.findIndex(p => p.id === selected.id);
  fromPool.splice(rmIndex, 1);

  state.current = {
    player: selected,
    category: state.category,
    bid: selected.basePrice,
    bidder: null
  };

  cancelTimer();
  autoSaveState();
  renderAll();
}

// ===============================
// Skip player
// ===============================
export function skipPlayer() {
  if (!state.current) {
    alert('No active player to skip.');
    return;
  }

  const player = state.current.player;

  if (state.current.bidder === null) {
    applyUnsoldReduction(player);
    state.pools.UNSOLD.push(player);
  } else {
    state.skipped[state.current.category].push(player);
  }

  state.current = null;
  cancelTimer();
  autoSaveState();
  renderAll();
}

// ===============================
// Bidding
// ===============================
export function placeBid(teamIndex) {
  if (!state.current) {
    alert('No active player.');
    return;
  }

  if (state.current.bidder === teamIndex) return;

  const step = Math.max(1, Number(dom.bidStepInput.value) || 0);
  const team = state.teams[teamIndex];

  const nextBid =
    state.current.bidder === null
      ? state.current.bid
      : state.current.bid + step;

  if (nextBid > team.budget) {
    showWarn(`Insufficient budget for ${team.name}.`);
    return;
  }

  showWarn('');
  state.current.bid = nextBid;
  state.current.bidder = teamIndex;

  startOrResetTimer();
  autoSaveState();
  renderCurrent();
}

// ===============================
// Sell player
// ===============================
export function sell() {
  if (!state.current || state.current.bidder === null) {
    alert('Cannot sell.');
    return;
  }

  const { player, category, bid, bidder } = state.current;

  state.teams[bidder].budget -= bid;

  state.sales.push({
    timeISO: new Date().toISOString(),
    team: state.teams[bidder].name,
    teamIndex: bidder,
    playerId: player.id,
    playerName: player.name,
    category,
    price: bid,
    position: player.position || '',
    playerSnapshot: { ...player }
  });

  state.current = null;
  cancelTimer();

  autoSaveState();
  renderAll();
}

// ===============================
// Undo last sale
// ===============================
export function undoLastSale() {
  const last = state.sales.pop();

  if (!last) {
    alert('No sales yet.');
    return;
  }

  state.teams[last.teamIndex].budget += last.price;

  const player = last.playerSnapshot;

  if (player) {
    state.pools[last.category].push({ ...player, unsoldCount: 0 });
  }

  autoSaveState();
  renderAll();
}
