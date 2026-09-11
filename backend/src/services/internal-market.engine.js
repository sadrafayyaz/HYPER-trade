const DEFAULT_MARKET = {
  BTC: 78500,
  ETH: 2480,
  SOL: 103,
  TRX: 0.338,
  USDT: 1,
};

const DEFAULT_CHANGE = {
  BTC: 0,
  ETH: 0,
  SOL: 0,
  TRX: 0,
  USDT: 0,
};

const SUPPORTED_SYMBOLS = Object.keys(
  DEFAULT_MARKET
);

const MIN_PRICES = {
  BTC: 1000,
  ETH: 50,
  SOL: 1,
  TRX: 0.0001,
  USDT: 0.5,
};

const MAX_HISTORY = 5000;
const TICK_INTERVAL_MS = 5000;

let prices = {};
let history = {};
let timer = null;
let running = false;
let initialized = false;

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function finitePositive(
  value,
  fallback = 0
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return fallback;
  }

  return number;
}

function normalizeSymbol(symbol) {
  const normalized = String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "");

  if (
    !SUPPORTED_SYMBOLS.includes(
      normalized
    )
  ) {
    throw new Error(
      `Unsupported market symbol: ${
        normalized || "UNKNOWN"
      }`
    );
  }

  return normalized;
}

function ensureInitialized() {
  if (initialized) {
    return;
  }

  for (
    const symbol of SUPPORTED_SYMBOLS
  ) {
    const price =
      DEFAULT_MARKET[symbol];

    prices[symbol] = {
      price,
      change24h:
        DEFAULT_CHANGE[symbol],
      source:
        "internal-reference",
      updatedAt:
        new Date().toISOString(),
    };

    history[symbol] = [
      {
        symbol,
        price,
        time: Date.now(),
        source: "seed",
      },
    ];
  }

  initialized = true;
}

function randomBetween(
  min,
  max
) {
  return (
    Math.random() *
      (max - min) +
    min
  );
}

function getVolatility(symbol) {
  switch (symbol) {
    case "BTC":
      return 0.0015;

    case "ETH":
      return 0.002;

    case "SOL":
      return 0.0035;

    case "TRX":
      return 0.004;

    case "USDT":
      return 0.0001;

    default:
      return 0.002;
  }
}

function calculateChange24h(symbol) {
  const points =
    history[symbol] || [];

  if (points.length < 2) {
    return 0;
  }

  const latest =
    finitePositive(
      points.at(-1)?.price,
      prices[symbol].price
    );

  const targetTime =
    Date.now() -
    24 * 60 * 60 * 1000;

  let reference =
    points[0];

  for (
    let index =
      points.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      Number(
        points[index].time
      ) <= targetTime
    ) {
      reference =
        points[index];
      break;
    }
  }

  const referencePrice =
    finitePositive(
      reference?.price,
      latest
    );

  if (
    referencePrice <= 0
  ) {
    return 0;
  }

  return (
    ((latest -
      referencePrice) /
      referencePrice) *
    100
  );
}

function appendHistory(
  symbol,
  price,
  source = "internal"
) {
  if (!history[symbol]) {
    history[symbol] = [];
  }

  history[symbol].push({
    symbol,
    price,
    time: Date.now(),
    source,
  });

  if (
    history[symbol].length >
    MAX_HISTORY
  ) {
    history[symbol] =
      history[symbol].slice(
        -MAX_HISTORY
      );
  }
}

function updateSymbol(
  symbol
) {
  const current =
    finitePositive(
      prices[symbol]?.price,
      DEFAULT_MARKET[symbol]
    );

  const volatility =
    getVolatility(symbol);

  const drift = randomBetween(
    -volatility,
    volatility
  );

  const meanReversion =
    ((DEFAULT_MARKET[symbol] -
      current) /
      DEFAULT_MARKET[symbol]) *
    0.00015;

  let nextPrice =
    current *
    (1 +
      drift +
      meanReversion);

  if (symbol === "USDT") {
    nextPrice = Math.max(
      0.97,
      Math.min(
        1.03,
        nextPrice
      )
    );
  }

  nextPrice = Math.max(
    MIN_PRICES[symbol],
    nextPrice
  );

  prices[symbol] = {
    price: nextPrice,
    change24h:
      calculateChange24h(
        symbol
      ),
    source:
      "internal-reference",
    updatedAt:
      new Date().toISOString(),
  };

  appendHistory(
    symbol,
    nextPrice,
    "internal-tick"
  );
}

/* =========================================================
   INTERNAL TRADE PRICE DISCOVERY
   Existing market tick logic remains available. Completed
   Hyper Trade executions are used to update internal prices.
========================================================= */

async function syncPricesFromExecutedTrades() {
  ensureInitialized();

  let executedOrders = [];

  try {
    executedOrders =
      await require("../prisma").order.findMany({
        where: {
          status: "COMPLETED",
          type: {
            in: [
              "MARKET",
              "LIMIT",
            ],
          },
          symbol: {
            in: [
              "BTC/USDT",
              "ETH/USDT",
              "SOL/USDT",
              "TRX/USDT",
            ],
          },
          executedAt: {
            not: null,
          },
        },
        orderBy: {
          executedAt: "desc",
        },
        take: 500,
        select: {
          symbol: true,
          amount: true,
          price: true,
          executedAt: true,
        },
      });
  } catch (error) {
    console.error(
      "❌ Internal trade price discovery query failed:",
      error.message
    );

    return getMarketSnapshot();
  }

  const aggregates = {};

  for (const order of executedOrders) {
    const normalizedSymbol =
      String(order.symbol || "")
        .trim()
        .toUpperCase();

    const base =
      normalizedSymbol.split("/")[0];

    if (
      !SUPPORTED_SYMBOLS.includes(base)
    ) {
      continue;
    }

    const amount = Number(order.amount);
    const price = Number(order.price);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    if (!aggregates[base]) {
      aggregates[base] = {
        volume: 0,
        value: 0,
        latestPrice: price,
      };
    }

    aggregates[base].volume += amount;
    aggregates[base].value += amount * price;

    const latestTime =
      order.executedAt
        ? new Date(order.executedAt).getTime()
        : 0;

    if (
      latestTime >
      (aggregates[base].latestTime || 0)
    ) {
      aggregates[base].latestTime = latestTime;
      aggregates[base].latestPrice = price;
    }
  }

  for (
    const [base, aggregate] of Object.entries(
      aggregates
    )
  ) {
    const discoveredPrice =
      aggregate.volume > 0
        ? aggregate.value / aggregate.volume
        : aggregate.latestPrice;

    if (
      Number.isFinite(discoveredPrice) &&
      discoveredPrice > 0
    ) {
      setPrice(
        base,
        discoveredPrice,
        "internal-trade-price-discovery"
      );
    }
  }

  return getMarketSnapshot();
}

function tick() {
  if (!initialized) {
    ensureInitialized();
  }

  for (
    const symbol of SUPPORTED_SYMBOLS
  ) {
    updateSymbol(symbol);
  }
}

function getMarketSnapshot() {
  ensureInitialized();

  return clone(prices);
}

function getPrice(symbol) {
  const normalized =
    normalizeSymbol(symbol);

  ensureInitialized();

  return prices[
    normalized
  ].price;
}

function getHistory(
  symbol,
  limit = 500
) {
  const normalized =
    normalizeSymbol(symbol);

  ensureInitialized();

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 500,
        1
      ),
      MAX_HISTORY
    );

  return clone(
    history[normalized].slice(
      -safeLimit
    )
  );
}

function setPrice(
  symbol,
  price,
  source =
    "internal-adjustment"
) {
  const normalized =
    normalizeSymbol(symbol);

  const nextPrice =
    finitePositive(price);

  if (nextPrice <= 0) {
    throw new Error(
      "Price must be greater than zero."
    );
  }

  ensureInitialized();

  prices[normalized] = {
    price: nextPrice,
    change24h:
      calculateChange24h(
        normalized
      ),
    source,
    updatedAt:
      new Date().toISOString(),
  };

  appendHistory(
    normalized,
    nextPrice,
    source
  );

  return clone(
    prices[normalized]
  );
}

function startInternalMarketEngine() {
  ensureInitialized();

  if (timer) {
    return;
  }

  timer = setInterval(
    () => {
      if (running) {
        return;
      }

      running = true;

      void syncPricesFromExecutedTrades()
        .catch((error) => {
          console.error(
            "❌ Internal market engine error:",
            error.message
          );
        })
        .finally(() => {
          running = false;
        });
    },
    TICK_INTERVAL_MS
  );

  console.log(
    "📈 Hyper Trade Internal Market Engine started"
  );

  console.log(
    "💱 Hyper Trade internal trade price discovery enabled"
  );
}

function stopInternalMarketEngine() {
  if (!timer) {
    return;
  }

  clearInterval(timer);

  timer = null;
  running = false;

  console.log(
    "🛑 Hyper Trade Internal Market Engine stopped"
  );
}

ensureInitialized();

module.exports = {
  SUPPORTED_SYMBOLS,
  startInternalMarketEngine,
  stopInternalMarketEngine,
  getMarketSnapshot,
  getPrice,
  getHistory,
  setPrice,
};