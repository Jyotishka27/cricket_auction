import { state } from './state.js';
import { renderCurrent } from './renderer.js';
import { autoSaveState } from './autosave.js';
import { sell } from './actions.js';
import { updateButtonStates } from './renderer.js'; // important

// ===============================
// Start or reset auction timer
// ===============================
export function startOrResetTimer() {
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
  autoSaveState();
}

// ===============================
// Cancel timer safely
// ===============================
export function cancelTimer() {
  if (state.timer.handle) {
    clearInterval(state.timer.handle);
  }

  state.timer = {
    handle: null,
    left: 0,
    running: false
  };

  autoSaveState();
  updateButtonStates();
  renderCurrent();
}

// ===============================
// Auto-sell when timer expires
// ===============================
function autoSellOnTimer() {
  cancelTimer();

  if (!state.current) return;

  if (state.current.bidder === null) {
    alert('Timer ended but no bids. Player remains unsold.');
    return;
  }

  sell();
}
