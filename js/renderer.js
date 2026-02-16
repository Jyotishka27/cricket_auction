// ===============================
// renderer.js
// ===============================

// -- Cached DOM elements --
const dom = {
  teamsTable: document.getElementById('teamsTable'),
  results: document.getElementById('results'),
  remainCat: document.getElementById('remainCat'),
  remainCount: document.getElementById('remainCount'),
  remainList: document.getElementById('remainList'),
  currentPlayerCard: document.getElementById('currentPlayerCard'),
  playerImg: document.getElementById('playerImg'),
  playerName: document.getElementById('playerName'),
  playerCat: document.getElementById('playerCat'),
  playerPosition: document.getElementById('playerPosition'),
  playerBase: document.getElementById('playerBase'),
  currentBid: document.getElementById('currentBid'),
  countdown: document.getElementById('countdown'),
  warn: document.getElementById('warn'),
  bidTeamsContainer: document.getElementById('bidTeamsContainer'),
  btnNext: document.getElementById('btnNext'),
  btnSkip: document.getElementById('btnSkip'),
  btnSell: document.getElementById('btnSell'),
  btnToggleResults: document.getElementById('btnToggleResults'),
  catButtons: document.querySelectorAll('.catBtn'),
  bidStepInput: document.getElementById('bidStep')
};

// ===============================
// Master render
// ===============================
function renderAll() {
  renderTeams();
  renderResults();
  renderRemain();
  renderCurrent();
  highlightCat();
}

// ===============================
// Category UI
// ===============================
function highlightCat() {
  dom.catButtons.forEach((btn) => {
    if (btn.dataset.cat === state.category) {
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
    } else {
      btn.classList.remove('bg-slate-900', 'text-white');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    }
  });

  dom.remainCat.textContent = catLabel(state.category);
}

// ===============================
// Teams / Budgets
// ===============================
function renderTeams() {
  dom.teamsTable.innerHTML = '';

  state.teams.forEach((team, i) => {
    const row = document.createElement('div');
    row.className = 'py-2 flex items-center justify-between gap-3';

    row.innerHTML = `
      <div class="font-medium">${team.name}</div>
      <div class="text-right">
        <div class="text-xs text-slate-500">Remaining</div>
        <div class="font-semibold">
          <button data-edit-team="${i}" class="editable underline-offset-2 hover:underline">
            ₹ <span>${fmt(team.budget)}</span>
          </button>
        </div>
      </div>
    `;

    dom.teamsTable.appendChild(row);

    row.querySelector('[data-edit-team]').addEventListener('click', () => {
      const input = prompt(`Edit remaining budget for ${team.name}`, team.budget);
      if (input === null) return;

      const newVal = Number(input);
      if (!isNaN(newVal) && newVal >= 0) {
        state.teams[i].budget = Math.floor(newVal);
        renderTeams();
        renderBidButtons();
        renderResults();
      }
    });
  });
}

// ===============================
// Results (Live)
// ===============================
function renderResults() {
  dom.results.innerHTML = '';

  if (dom.btnToggleResults.dataset.hidden === '1') return;

  const byTeam = new Map(
    state.teams.map((t, i) => [i, { teamName: t.name, players: [], spent: 0 }])
  );

  state.sales.forEach((sale) => {
    const teamData = byTeam.get(sale.teamIndex);
    if (!teamData) return;

    teamData.players.push(sale);
    teamData.spent += sale.price;
  });

  byTeam.forEach((teamData, idx) => {
    const container = document.createElement('div');
    container.className = 'rounded-xl border border-slate-200 p-3 mb-4';

    const playerList =
      teamData.players.length === 0
        ? '<li class="text-slate-500 text-sm">No players yet</li>'
        : teamData.players
            .map(
              (p) => `
                <li class="flex justify-between">
                  <span>
                    ${p.playerName}
                    <span class="text-xs text-slate-500">(${catLabel(p.category)})</span>
                  </span>
                  <span>₹ ${fmt(p.price)}</span>
                </li>`
            )
            .join('');

    container.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="font-semibold">${teamData.teamName}</div>
        <div class="text-sm text-slate-600">
          Spent: <strong>₹ ${fmt(teamData.spent)}</strong>
          &bull;
          Left: <strong>₹ ${fmt(state.teams[idx].budget)}</strong>
        </div>
      </div>
      <ul class="space-y-1 list-disc pl-5">${playerList}</ul>
    `;

    dom.results.appendChild(container);
  });

  // Unsold players
  const unsoldSection = document.createElement('div');
  unsoldSection.className = 'rounded-xl border border-rose-300 p-3 bg-rose-50';

  unsoldSection.innerHTML = `
    <h4 class="font-semibold text-rose-700 mb-2">UnSold Players</h4>
    <ul class="list-disc pl-5 space-y-1">
      ${
        state.pools.UNSOLD.length
          ? state.pools.UNSOLD
              .map(
                (p) => `
                  <li>
                    ${p.name}
                    <span class="text-xs text-slate-500">(${p.position || 'N/A'})</span>
                    &mdash; ₹ ${fmt(p.basePrice)}
                  </li>`
              )
              .join('')
          : '<li class="text-slate-500 text-sm">No unsold players</li>'
      }
    </ul>
  `;

  dom.results.appendChild(unsoldSection);
}

// ===============================
// Remaining Players
// ===============================
function renderRemain() {
  const pool = [
    ...(state.pools[state.category] || []),
    ...(state.skipped[state.category] || [])
  ];

  dom.remainCount.textContent = pool.length;

  dom.remainList.innerHTML = pool
    .map(
      (p) => `
        <div class="rounded-lg border border-slate-200 p-2">
          ${p.name}
          <div class="text-xs text-slate-500">₹ ${fmt(p.basePrice)}</div>
        </div>`
    )
    .join('');
}

// ===============================
// Current Player
// ===============================
function renderCurrent() {
  if (!state.current) {
    dom.currentPlayerCard.hidden = true;
    return;
  }

  const { player, category, bid } = state.current;
  dom.currentPlayerCard.hidden = false;

  dom.playerImg.src =
    player.img ||
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop';

  dom.playerName.textContent =
    player.unsoldCount > 0
      ? `${player.name} (↓${player.unsoldCount})`
      : player.name;

  dom.playerCat.textContent = catLabel(category);
  dom.playerPosition.textContent = player.position || '';
  dom.playerBase.textContent = `₹ ${fmt(player.basePrice)}`;
  dom.currentBid.value = bid;

  if (state.timer.running) {
    dom.countdown.textContent = `${state.timer.left}s`;
    dom.countdown.classList.toggle('blink', state.timer.left <= 10);
  } else {
    dom.countdown.textContent = '—';
    dom.countdown.classList.remove('blink');
  }

  renderBidButtons();
  updateButtonStates();
  clearWarn();
}

// ===============================
// Bid Buttons
// ===============================
function renderBidButtons() {
  dom.bidTeamsContainer.innerHTML = '';
  if (!state.current) return;

  const step = Math.max(1, Number(dom.bidStepInput.value) || 0);
  const currentBid = state.current.bid;
  const hasBidder = state.current.bidder !== null;

  state.teams.forEach((team, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'px-2 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs';
    btn.textContent = team.name;

    const nextBid = hasBidder ? currentBid + step : currentBid;
    if (nextBid > team.budget) btn.disabled = true;

    btn.addEventListener('click', () => placeBid(i));
    dom.bidTeamsContainer.appendChild(btn);
  });
}

// ===============================
// Button states
// ===============================
function updateButtonStates() {
  const disable = state.timer.running;
  dom.btnNext.disabled = disable;
  dom.btnSkip.disabled = disable;
  dom.btnSell.disabled = !state.current || state.current.bidder === null;
}
