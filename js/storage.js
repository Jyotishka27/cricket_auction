// ===============================
// storage.js
// ===============================

// -------------------------------
// Load initial auction data
// -------------------------------
async function loadAuctionData() {
  try {
    const response = await fetch('./data/auction-data.json');

    if (!response.ok) {
      throw new Error('Failed to load auction data');
    }

    const data = await response.json();

    // Initialize base auction state
    state.pools = data.pools || {};
    state.teams = data.teams || [];
    state.category = data.category || null;

    // Reset runtime values
    state.sales = [];
    state.skipped = [];
    state.current = null;
    state.timer = { handle: null, left: 0, running: false };

  } catch (err) {
    console.error('Auction data load error:', err);
  }
}


// -------------------------------
// Export auction results as CSV
// -------------------------------
function exportCSV() {
  const rows = [];

  state.teams.forEach((team, idx) => {
    rows.push([`Team: ${team.name}`, '', '', '', '']);
    rows.push(['Time', 'Player', 'Category', 'Position', 'Price']);

    const teamSales = state.sales.filter(s => s.teamIndex === idx);
    teamSales.forEach(sale => {
      rows.push([
        sale.timeISO,
        sale.playerName,
        catLabel(sale.category),
        sale.position || '',
        String(sale.price)
      ]);
    });

    rows.push([]); // empty line between teams
  });

  const csvContent = rows
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'auction-results-teamwise.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
}


// -------------------------------
// Manual save auction state
// -------------------------------
function saveState() {
  const snapshot = {
    state: {
      category: state.category,
      pools: state.pools,
      skipped: state.skipped,
      current: state.current,
      teams: state.teams,
      sales: state.sales
    },
    savedAt: new Date().toISOString(),
    note: 'Football Auctioneer snapshot'
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'auction-state.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
}


// -------------------------------
// Load auction state from file
// -------------------------------
function loadState(fileList) {
  const file = fileList[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data || !data.state) {
        throw new Error('Invalid auction state file.');
      }

      Object.assign(state, {
        category: data.state.category,
        pools: data.state.pools,
        skipped: data.state.skipped,
        current: data.state.current,
        teams: data.state.teams,
        sales: data.state.sales,
        timer: { handle: null, left: 0, running: false }
      });

      cancelTimer();
      renderAll();

    } catch (err) {
      alert(`Failed to load state: ${err.message}`);
    }
  };

  reader.readAsText(file);
}
