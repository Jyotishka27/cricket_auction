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
  autoSaveState();
  renderAll();
}

function setRightPanelTab(tabName) {
  state.ui.rightPanelTab = tabName;
  autoSaveState();
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

  autoSaveState();
  renderAll();
}

function reauctionPlayer(saleIndex) {
  const sale = state.sales[saleIndex];

  if (!sale) {
    alert('Sale record not found.');
    return;
  }

  if (!state.pools[sale.category]) {
    alert('Original pool not found for this player.');
    return;
  }

  state.teams[sale.teamIndex].budget += sale.price;

  const restoredPlayer = sale.playerSnapshot
    ? { ...sale.playerSnapshot }
    : (() => {
        const masterPlayer = findPlayerInMaster(sale.playerId, sale.category);
        return masterPlayer ? { ...masterPlayer, unsoldCount: 0 } : null;
      })();

  if (!restoredPlayer) {
    alert('Could not restore player for reauction.');
    return;
  }

  state.sales.splice(saleIndex, 1);
  state.pools[sale.category].push(restoredPlayer);

  autoSaveState();
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

  // No bids → UNSOLD → reduce valuation
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
// Cancel auction
// ===============================
function cancelAuction() {
  if (!state.current) return;

  cancelTimer(); // just stop timer
}

// ===============================
// Rules / Squad helpers
// ===============================
function getTeamSales(teamIndex) {
  return state.sales.filter((sale) => sale.teamIndex === teamIndex);
}

function getTeamTotalPlayers(teamIndex) {
  return getTeamSales(teamIndex).length;
}

function getTeamPoolCount(teamIndex, poolId) {
  return getTeamSales(teamIndex).filter((sale) => sale.category === poolId).length;
}

function getAvailablePlayersByPool(poolId, excludePlayerId = null) {
  const players = [
    ...(state.pools[poolId] || []),
    ...(state.skipped[poolId] || [])
  ];

  return players.filter((player) => player.id !== excludePlayerId);
}

function getHypotheticalTeamCounts(teamIndex, currentPlayerCategory) {
  const counts = {};

  Object.keys(state.rules.pools || {}).forEach((poolId) => {
    counts[poolId] = getTeamPoolCount(teamIndex, poolId);
  });

  counts[currentPlayerCategory] = (counts[currentPlayerCategory] || 0) + 1;
  return counts;
}

function getMinimumCompletionCost(teamIndex, currentPlayer) {
  const rules = state.rules;
  const hypotheticalCounts = getHypotheticalTeamCounts(teamIndex, currentPlayer.category);

  let hypotheticalTotalPlayers = getTeamTotalPlayers(teamIndex) + 1;
  let reservedCost = 0;
  const reservedPlayerIds = new Set();
  const reservedCounts = { ...hypotheticalCounts };

  // Step 1: satisfy per-pool minimums
  for (const poolId of Object.keys(rules.pools || {})) {
    const poolRule = rules.pools[poolId];
    const deficit = Math.max(0, poolRule.min - (reservedCounts[poolId] || 0));

    if (deficit === 0) continue;

    const candidates = getAvailablePlayersByPool(poolId, currentPlayer.id)
      .sort((a, b) => a.basePrice - b.basePrice);

    if (candidates.length < deficit) {
      return Infinity;
    }

    for (let i = 0; i < deficit; i++) {
      reservedCost += candidates[i].basePrice;
      reservedPlayerIds.add(candidates[i].id);
      reservedCounts[poolId] = (reservedCounts[poolId] || 0) + 1;
      hypotheticalTotalPlayers += 1;
    }
  }

  // Step 2: satisfy overall team minimum
  let extraPlayersNeeded = Math.max(0, rules.minPlayersPerTeam - hypotheticalTotalPlayers);

  if (extraPlayersNeeded === 0) {
    return reservedCost;
  }

  const extraCandidates = [];

  for (const poolId of Object.keys(rules.pools || {})) {
    const poolRule = rules.pools[poolId];
    const currentCountInPool = reservedCounts[poolId] || 0;
    const remainingSlotsInPool = Math.max(0, poolRule.max - currentCountInPool);

    if (remainingSlotsInPool === 0) continue;

    const candidates = getAvailablePlayersByPool(poolId, currentPlayer.id)
      .filter((player) => !reservedPlayerIds.has(player.id))
      .sort((a, b) => a.basePrice - b.basePrice)
      .slice(0, remainingSlotsInPool);

    extraCandidates.push(
      ...candidates.map((player) => ({
        ...player,
        __poolId: poolId
      }))
    );
  }

  extraCandidates.sort((a, b) => a.basePrice - b.basePrice);

  if (extraCandidates.length < extraPlayersNeeded) {
    return Infinity;
  }

  for (let i = 0; i < extraPlayersNeeded; i++) {
    reservedCost += extraCandidates[i].basePrice;
  }

  return reservedCost;
}

function getMaxAllowedBid(teamIndex) {
  if (!state.current) return 0;

  const team = state.teams[teamIndex];
  const currentPlayer = {
    ...state.current.player,
    category: state.current.category
  };

  const currentTotalPlayers = getTeamTotalPlayers(teamIndex);
  if (currentTotalPlayers >= state.rules.maxPlayersPerTeam) {
    return 0;
  }

  const currentPoolCount = getTeamPoolCount(teamIndex, currentPlayer.category);
  const poolRule = state.rules.pools[currentPlayer.category];

  if (poolRule && currentPoolCount >= poolRule.max) {
    return 0;
  }

  const minCompletionCost = getMinimumCompletionCost(teamIndex, currentPlayer);

  if (minCompletionCost === Infinity) {
    return 0;
  }

  return Math.max(0, team.budget - minCompletionCost);
}

function saveRulesFromUI() {
  const minPlayersPerTeam = Math.floor(Number(dom.ruleMinPlayersPerTeam.value));
  const maxPlayersPerTeam = Math.floor(Number(dom.ruleMaxPlayersPerTeam.value));

  if (isNaN(minPlayersPerTeam) || minPlayersPerTeam < 1) {
    alert('Minimum players per team must be at least 1.');
    return;
  }

  if (isNaN(maxPlayersPerTeam) || maxPlayersPerTeam < minPlayersPerTeam) {
    alert('Maximum players per team must be greater than or equal to minimum players per team.');
    return;
  }

  const nextRules = {
    minPlayersPerTeam,
    maxPlayersPerTeam,
    pools: {}
  };

  for (const poolId of Object.keys(state.rules.pools || {})) {
    const mandatoryEl = document.querySelector(`[data-rule-pool-mandatory="${poolId}"]`);
    const minEl = document.querySelector(`[data-rule-pool-min="${poolId}"]`);
    const maxEl = document.querySelector(`[data-rule-pool-max="${poolId}"]`);

    const mandatory = !!mandatoryEl.checked;
    const min = Math.floor(Number(minEl.value));
    const max = Math.floor(Number(maxEl.value));

    if (isNaN(min) || min < 0) {
      alert(`${catLabel(poolId)} min is invalid.`);
      return;
    }

    if (isNaN(max) || max < 0) {
      alert(`${catLabel(poolId)} max is invalid.`);
      return;
    }

    if (max < min) {
      alert(`${catLabel(poolId)} max cannot be less than min.`);
      return;
    }

    if (!mandatory && min > 0) {
      alert(`${catLabel(poolId)} cannot have min > 0 if mandatory is off.`);
      return;
    }

    if (mandatory && min < 1) {
      alert(`${catLabel(poolId)} must have min at least 1 if mandatory is on.`);
      return;
    }

    nextRules.pools[poolId] = { mandatory, min, max };
  }

  const sumPoolMins = Object.values(nextRules.pools).reduce((sum, pool) => sum + pool.min, 0);
  const sumPoolMaxes = Object.values(nextRules.pools).reduce((sum, pool) => sum + pool.max, 0);

  if (sumPoolMins > nextRules.maxPlayersPerTeam) {
    alert('Sum of pool minimums cannot exceed maximum players per team.');
    return;
  }

  if (nextRules.minPlayersPerTeam > sumPoolMaxes) {
    alert('Minimum players per team cannot exceed total possible pool maximums.');
    return;
  }

  state.rules = nextRules;

  if (dom.rulesMessage) {
    dom.rulesMessage.textContent = 'Rules saved successfully.';
  }

  autoSaveState();
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

  const teamPlayerCount = getTeamTotalPlayers(teamIndex);
  if (teamPlayerCount >= state.rules.maxPlayersPerTeam) {
    showWarn(`${team.name} already has the maximum allowed players.`);
    return;
  }

  const poolRule = state.rules.pools[state.current.category];
  const teamPoolCount = getTeamPoolCount(teamIndex, state.current.category);

  if (poolRule && teamPoolCount >= poolRule.max) {
    showWarn(`${team.name} already reached max players for ${catLabel(state.current.category)}.`);
    return;
  }

  if (nextBid > team.budget) {
    showWarn(`Insufficient budget for ${team.name}.`);
    return;
  }

  const maxAllowedBid = getMaxAllowedBid(teamIndex);

  if (nextBid > maxAllowedBid) {
    showWarn(
      `${team.name} cannot bid above ₹ ${fmt(maxAllowedBid)}. They must retain enough budget to complete the squad.`
    );
    return;
  }

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
  if (!state.current) {
    alert('No active player.');
    return;
  }

  if (state.current.bidder === null) {
    alert('No bids yet. Cannot sell.');
    return;
  }

  const { player, category, bid, bidder } = state.current;

  if (state.teams[bidder].budget < bid) {
    alert('Budget insufficient. Cannot sell.');
    return;
  }

  const bidderTeamCount = getTeamTotalPlayers(bidder);
  if (bidderTeamCount >= state.rules.maxPlayersPerTeam) {
    alert('This team already has the maximum allowed players.');
    return;
  }

  const bidderPoolCount = getTeamPoolCount(bidder, category);
  const bidderPoolRule = state.rules.pools[category];

  if (bidderPoolRule && bidderPoolCount >= bidderPoolRule.max) {
    alert(`This team already reached max allowed players for ${catLabel(category)}.`);
    return;
  }

  const minCompletionCost = getMinimumCompletionCost(bidder, { ...player, category });
  const remainingAfterSale = state.teams[bidder].budget - bid;

  if (remainingAfterSale < minCompletionCost) {
    alert('This sale would violate squad completion budget rules.');
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
    position: player.position || '',
    playerSnapshot: { ...player }
  });

  state.current = null;
  cancelTimer();

  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('auction_updates');
    channel.postMessage({
      sales: state.sales,
      budgets: state.teams.map((t) => t.budget)
    });
  }

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

  const originalPlayer = findPlayerInMaster(last.playerId, last.category);
  if (originalPlayer) {
    state.pools[last.category].push({
      ...originalPlayer,
      unsoldCount: 0
    });
  }

  autoSaveState();
  renderAll();
}

// ===============================
// Master data lookup
// ===============================
function findPlayerInMaster(id, cat) {
  if (cat === 'UNSOLD') return null;
  return (AUCTION_DATA.players[cat] || []).find(p => p.id === id) || null;
}

