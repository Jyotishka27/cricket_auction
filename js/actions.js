// ===============================
// actions.js
// ===============================

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
  renderAll();
}

function setRightPanelTab(tabName) {
  state.ui.rightPanelTab = tabName;
  renderAll();
}

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

  if (
    state.current &&
    state.current.player &&
    state.current.player.id === playerId
  ) {
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

  if (
    state.current &&
    state.current.category === category &&
    state.current.player
  ) {
    state.current.player.basePrice = price;

    if (state.current.bidder === null) {
      state.current.bid = price;
    }
  }

  renderAll();
}

// ===============================
// Player selection
// ===============================
function nextPlayer() {
  // Return current player back to pool if needed
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

  // No bids → UNSOLD → reduce valuation
  if (state.current.bidder === null) {
    applyUnsoldReduction(player);
    state.pools.UNSOLD.push(player);
  } else {
    state.skipped[state.current.category].push(player);
  }

  state.current = null;
  cancelTimer();
  renderAll();
}

// ===============================
// Cancel auction
// ===============================
function cancelAuction() {
  if (!state.current) return;

  cancelTimer(); // just stop timer
}

// ===============================
// Bidding
// ===============================
function placeBid(teamIndex) {
  if (!state.current) {
    alert('No active player. Click Next Player.');
    return;
  }

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

  state.current.bid = nextBid;
  state.current.bidder = teamIndex;

  startOrResetTimer();
  renderCurrent();
}

// ===============================
// Sell player
// ===============================
function sell() {
  if (!state.current) {
    alert('No active player.');
    return;
  }

  if (state.current.bidder === null) {
    alert('No bids yet. Cannot sell.');
    return;
  }

  const { player, category, bid, bidder } = state.current;

  // Safety: prevent negative budget
  if (state.teams[bidder].budget < bid) {
    alert('Budget insufficient. Cannot sell.');
    return;
  }

  state.teams[bidder].budget -= bid;

  state.sales.push({
    timeISO: new Date().toISOString(),
    team: state.teams[bidder].name,
    teamIndex: bidder,
    playerId: player.id,
    playerName: player.name,
    category,
    price: bid,
    position: player.position || ''
  });

  state.current = null;
  cancelTimer();

  // Optional broadcast to other tabs
  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('auction_updates');
    channel.postMessage({
      sales: state.sales,
      budgets: state.teams.map(t => t.budget)
    });
  }

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

  const originalPlayer = findPlayerInMaster(last.playerId, last.category);
  if (originalPlayer) {
    state.pools[last.category].push({
      ...originalPlayer,
      unsoldCount: 0
    });
  }

  renderAll();
}

// ===============================
// Master data lookup
// ===============================
function findPlayerInMaster(id, cat) {
  if (cat === 'UNSOLD') return null;
  return (AUCTION_DATA.players[cat] || []).find(p => p.id === id) || null;
}

