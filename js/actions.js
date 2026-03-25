import { state } from './state.js';
import { fmt, catLabel } from './utils.js';
import { placeBid, nextPlayer, skipPlayer, undoLastSale, sell } from './actions.js';

// ===============================
// Category handling
// ===============================
function setCategory(cat) {
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

function setRightPanelTab(tabName) {
  state.ui.rightPanelTab = tabName;
  autoSaveState();
  renderAll();
}

// ===============================
// Player Management
// ===============================
function movePlayer(playerId, fromCategory, toCategory) {
  if (fromCategory === toCategory) return;

  if (state.current && state.current.player && state.current.player.id === playerId) {
    alert('Cannot move the player currently being auctioned.');
    return;
  }

  let playerIndex = state.pools[fromCategory].findIndex((p) => p.id === playerId);
  let player = null;

  if (playerIndex !== -1) {
    player = state.pools[fromCategory].splice(playerIndex, 1)[0];
  } else {
    playerIndex = state.skipped[fromCategory].findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      player = state.skipped[fromCategory].splice(playerIndex, 1)[0];
    }
  }

  if (!player) {
    alert('Player not found in the selected pool.');
    return;
  }

  state.pools[toCategory].push(player);
  autoSaveState();
  renderAll();
}

function updatePlayerBasePrice(playerId, category, newBasePrice) {
  const price = Math.floor(Number(newBasePrice));

  if (isNaN(price) || price < 0) {
    alert('Please enter a valid base price.');
    return;
  }

  let updated = false;

  const poolPlayer = (state.pools[category] || []).find((p) => p.id === playerId);
  if (poolPlayer) {
    poolPlayer.basePrice = price;
    updated = true;
  }

  const skippedPlayer = (state.skipped[category] || []).find((p) => p.id === playerId);
  if (skippedPlayer) {
    skippedPlayer.basePrice = price;
    updated = true;
  }

  if (state.current && state.current.player?.id === playerId) {
    state.current.player.basePrice = price;

    if (state.current.bidder === null) {
      state.current.bid = price;
    }

    updated = true;
  }

  if (!updated) {
    alert('Player not found.');
    return;
  }

  autoSaveState();
  renderAll();
}

function updatePoolBasePrice(category, newBasePrice) {
  const price = Math.floor(Number(newBasePrice));

  if (isNaN(price) || price < 0) {
    alert('Please enter a valid base price.');
    return;
  }

  if (!state.pools[category] || !state.skipped[category]) {
    alert('Invalid pool selected.');
    return;
  }

  state.pools[category].forEach((player) => {
    player.basePrice = price;
  });

  state.skipped[category].forEach((player) => {
    player.basePrice = price;
  });

  if (state.current?.category === category) {
    state.current.player.basePrice = price;

    if (state.current.bidder === null) {
      state.current.bid = price;
    }
  }

  autoSaveState();
  renderAll();
}

// ===============================
// Reauction
// ===============================
function reauctionPlayer(saleIndex) {
  const sale = state.sales[saleIndex];

  if (!sale) {
    alert('Sale record not found.');
    return;
  }

  state.teams[sale.teamIndex].budget += sale.price;

  const restoredPlayer = sale.playerSnapshot
    ? { ...sale.playerSnapshot }
    : findPlayerInMaster(sale.playerId, sale.category);

  if (!restoredPlayer) {
    alert('Could not restore player for reauction.');
    return;
  }

  state.sales.splice(saleIndex, 1);
  state.pools[sale.category].push({ ...restoredPlayer, unsoldCount: 0 });

  autoSaveState();
  renderAll();
}

// ===============================
// Player selection
// ===============================
function nextPlayer() {
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

  if (merged.length === 0) {
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
// Skip / Unsold logic
// ===============================
function skipPlayer() {
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
function placeBid(teamIndex) {
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
function sell() {
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
function undoLastSale() {
  const last = state.sales.pop();

  if (!last) {
    alert('No sales yet.');
    return;
  }

  state.teams[last.teamIndex].budget += last.price;

  const player = last.playerSnapshot || findPlayerInMaster(last.playerId, last.category);

  if (player) {
    state.pools[last.category].push({ ...player, unsoldCount: 0 });
  }

  autoSaveState();
  renderAll();
}

// ===============================
// 🔥 FIXED MASTER LOOKUP
// ===============================
function findPlayerInMaster(id, cat) {
  if (cat === 'UNSOLD') return null;

  const players = [
    ...(state.pools[cat] || []),
    ...(state.skipped[cat] || [])
  ];

  return players.find(p => p.id === id) || null;
}
