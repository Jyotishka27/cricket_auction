// ===============================
// timer.js
// ===============================

// -------------------------------
// Start or reset auction timer
// -------------------------------
function startOrResetTimer() {
  state.timer.left = 45;

  if (!state.timer.running) {
    state.timer.running = true;

    state.timer.handle = setInterval(() => {
      state.timer.left -= 1;

      if (state.timer.left <= 0) {
        autoSellOnTimer();
        return;
      }

      renderCurrent();
    }, 1000);
  }

  updateButtonStates();
}

// -------------------------------
// Cancel timer safely
// -------------------------------
function cancelTimer() {
  if (state.timer.handle) {
    clearInterval(state.timer.handle);
  }

  state.timer = {
    handle: null,
    left: 0,
    running: false
  };

  updateButtonStates();
  renderCurrent();
}

// -------------------------------
// Auto-sell when timer expires
// -------------------------------
function autoSellOnTimer() {
  cancelTimer();

  if (!state.current) return;

  if (state.current.bidder === null) {
    alert('Timer ended but no bids. Player remains unsold.');
    return;
  }

  sell();
}

