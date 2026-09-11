const {
  processPendingOrders,
} = require("./order.service");

const MATCH_INTERVAL_MS = 3000;

let timer = null;
let running = false;

async function tick() {
  if (running) {
    return;
  }

  running = true;

  try {
    await processPendingOrders();
  } catch (error) {
    console.error(
      "❌ Limit order matcher error:",
      error.message
    );
  } finally {
    running = false;
  }
}

function startLimitOrderMatcher() {
  if (timer) {
    return;
  }

  void tick();

  timer = setInterval(() => {
    void tick();
  }, MATCH_INTERVAL_MS);
}

function stopLimitOrderMatcher() {
  if (!timer) {
    return;
  }

  clearInterval(timer);

  timer = null;
  running = false;
}

module.exports = {
  startLimitOrderMatcher,
  stopLimitOrderMatcher,
};