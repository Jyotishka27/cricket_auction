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

  const pool = state.pools[state.category];
  const skipped = state.skipped[state.category];
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

