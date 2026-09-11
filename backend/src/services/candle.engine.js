const {
  SUPPORTED_SYMBOLS,
  getHistory,
} = require(
  "./internal-market.engine"
);

const TIMEFRAME_SECONDS = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
};

function normalizeSymbol(
  symbol
) {
  const normalized =
    String(symbol || "")
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

function normalizeTimeframe(
  timeframe
) {
  const normalized =
    String(
      timeframe || "1H"
    ).trim();

  if (
    !Object.prototype.hasOwnProperty.call(
      TIMEFRAME_SECONDS,
      normalized
    )
  ) {
    throw new Error(
      `Unsupported timeframe: ${normalized}`
    );
  }

  return normalized;
}

function safeNumber(
  value,
  fallback = 0
) {
  const number = Number(
    value
  );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

function buildCandles(
  symbol,
  timeframe,
  limit = 200
) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const normalizedTimeframe =
    normalizeTimeframe(
      timeframe
    );

  const seconds =
    TIMEFRAME_SECONDS[
      normalizedTimeframe
    ];

  const bucketMs =
    seconds * 1000;

  const rawHistory =
    getHistory(
      normalizedSymbol,
      5000
    );

  const buckets =
    new Map();

  for (
    const point of rawHistory
  ) {
    const time = safeNumber(
      point.time,
      0
    );

    const price =
      safeNumber(
        point.price,
        0
      );

    if (
      time <= 0 ||
      price <= 0
    ) {
      continue;
    }

    const bucketTime =
      Math.floor(
        time / bucketMs
      ) *
      bucketMs;

    if (
      !buckets.has(
        bucketTime
      )
    ) {
      buckets.set(
        bucketTime,
        {
          time: bucketTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
          trades: 0,
          source:
            "internal-reference",
        }
      );

      continue;
    }

    const candle =
      buckets.get(
        bucketTime
      );

    candle.high =
      Math.max(
        candle.high,
        price
      );

    candle.low =
      Math.min(
        candle.low,
        price
      );

    candle.close =
      price;

    candle.trades += 1;
  }

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 200,
        1
      ),
      1000
    );

  return Array.from(
    buckets.values()
  )
    .sort(
      (a, b) =>
        a.time - b.time
    )
    .slice(-safeLimit);
}

module.exports = {
  TIMEFRAME_SECONDS,
  buildCandles,
};