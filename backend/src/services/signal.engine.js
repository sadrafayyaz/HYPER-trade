const {
  SUPPORTED_SYMBOLS,
  getMarketSnapshot,
  getPrice,
} = require(
  "./internal-market.engine"
);

const {
  buildCandles,
} = require(
  "./candle.engine"
);

const indicators =
  require(
    "./technical-indicators"
  );

const TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "1H",
  "4H",
  "1D",
];

const signalCache =
  new Map();

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
      `Unsupported signal symbol: ${
        normalized ||
        "UNKNOWN"
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
    !TIMEFRAMES.includes(
      normalized
    )
  ) {
    throw new Error(
      `Unsupported signal timeframe: ${normalized}`
    );
  }

  return normalized;
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function round(
  value,
  decimals = 6
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      Number(value) *
        factor
    ) / factor
  );
}

function getSignalFromScore(
  score
) {
  if (score >= 35) {
    return "BUY";
  }

  if (score <= -35) {
    return "SELL";
  }

  return "HOLD";
}

function calculateSignal(
  symbol,
  timeframe
) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const normalizedTimeframe =
    normalizeTimeframe(
      timeframe
    );

  const candles =
    buildCandles(
      normalizedSymbol,
      normalizedTimeframe,
      250
    );

  const closes =
    candles
      .map((candle) =>
        Number(candle.close)
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          ) &&
          value > 0
      );

  const currentPrice =
    getPrice(
      normalizedSymbol
    );

  if (
    closes.length < 8
  ) {
    return {
      symbol:
        normalizedSymbol,

      timeframe:
        normalizedTimeframe,

      signal: "WAIT",

      confidence: 0,

      score: 0,

      price: round(
        currentPrice,
        8
      ),

      candles:
        candles.length,

      indicators: {
        ema9: null,
        ema21: null,
        sma20: null,
        rsi14: 50,
        macd: 0,
        macdSignal: 0,
        macdHistogram: 0,
        atr14: 0,
        trendPercent: 0,
        volatilityPercent: 0,
      },

      reasons: [
        "Waiting for sufficient internal market history.",
      ],

      source:
        "Hyper Trade Internal Market",

      generatedAt:
        new Date().toISOString(),
    };
  }

  const ema9 =
    indicators.ema(
      closes,
      9
    );

  const ema21 =
    indicators.ema(
      closes,
      21
    );

  const sma20 =
    indicators.sma(
      closes,
      20
    );

  const rsi14 =
    indicators.rsi(
      closes,
      14
    );

  const macd =
    indicators.macd(
      closes
    );

  const atr14 =
    indicators.atr(
      candles,
      14
    );

  const trendPercent =
    indicators.percentChange(
      closes.slice(-20)
    );

  const volatilityPercent =
    indicators.volatilityPercent(
      closes.slice(-30)
    );

  const recent =
    closes.slice(-50);

  const support =
    Math.min(...recent);

  const resistance =
    Math.max(...recent);

  let score = 0;

  const reasons = [];

  if (ema9 > ema21) {
    score += 25;

    reasons.push(
      "EMA9 is above EMA21"
    );
  } else if (
    ema9 < ema21
  ) {
    score -= 25;

    reasons.push(
      "EMA9 is below EMA21"
    );
  }

  if (
    macd.macd >
    macd.signal
  ) {
    score += 20;

    reasons.push(
      "MACD is bullish"
    );
  } else if (
    macd.macd <
    macd.signal
  ) {
    score -= 20;

    reasons.push(
      "MACD is bearish"
    );
  }

  if (
    rsi14 >= 55 &&
    rsi14 <= 70
  ) {
    score += 15;

    reasons.push(
      "RSI momentum is bullish"
    );
  } else if (
    rsi14 >= 30 &&
    rsi14 < 45
  ) {
    score -= 15;

    reasons.push(
      "RSI momentum is bearish"
    );
  } else if (
    rsi14 > 70
  ) {
    score -= 10;

    reasons.push(
      "RSI is overbought"
    );
  } else if (
    rsi14 < 30
  ) {
    score += 10;

    reasons.push(
      "RSI is oversold"
    );
  }

  if (
    trendPercent > 0.25
  ) {
    score += 20;

    reasons.push(
      "Recent trend is positive"
    );
  } else if (
    trendPercent <
    -0.25
  ) {
    score -= 20;

    reasons.push(
      "Recent trend is negative"
    );
  }

  if (
    currentPrice > sma20
  ) {
    score += 10;

    reasons.push(
      "Price is above SMA20"
    );
  } else if (
    currentPrice < sma20
  ) {
    score -= 10;

    reasons.push(
      "Price is below SMA20"
    );
  }

  score = clamp(
    score,
    -100,
    100
  );

  const signal =
    getSignalFromScore(
      score
    );

  const confidence =
    Math.abs(score);

  const result = {
    symbol:
      normalizedSymbol,

    timeframe:
      normalizedTimeframe,

    signal,

    confidence,

    score,

    price: round(
      currentPrice,
      8
    ),

    candles:
      candles.length,

    indicators: {
      ema9: round(
        ema9,
        8
      ),

      ema21: round(
        ema21,
        8
      ),

      sma20: round(
        sma20,
        8
      ),

      rsi14: round(
        rsi14,
        4
      ),

      macd: round(
        macd.macd,
        8
      ),

      macdSignal:
        round(
          macd.signal,
          8
        ),

      macdHistogram:
        round(
          macd.histogram,
          8
        ),

      atr14: round(
        atr14,
        8
      ),

      trendPercent:
        round(
          trendPercent,
          4
        ),

      volatilityPercent:
        round(
          volatilityPercent,
          4
        ),

      support: round(
        support,
        8
      ),

      resistance: round(
        resistance,
        8
      ),
    },

    reasons,

    source:
      "Hyper Trade Internal Market",

    generatedAt:
      new Date().toISOString(),
  };

  signalCache.set(
    `${normalizedSymbol}:${normalizedTimeframe}`,
    result
  );

  return result;
}

function getSignal(
  symbol,
  timeframe = "1H"
) {
  return calculateSignal(
    symbol,
    timeframe
  );
}

function getAllSignals(
  timeframe = "1H"
) {
  const normalizedTimeframe =
    normalizeTimeframe(
      timeframe
    );

  const result = {};

  for (
    const symbol of
      SUPPORTED_SYMBOLS
  ) {
    result[symbol] =
      calculateSignal(
        symbol,
        normalizedTimeframe
      );
  }

  return result;
}

function getCachedSignals() {
  return Object.fromEntries(
    signalCache.entries()
  );
}

function getSignalMarketSnapshot() {
  return getMarketSnapshot();
}

module.exports = {
  TIMEFRAMES,
  getSignal,
  getAllSignals,
  getCachedSignals,
  getSignalMarketSnapshot,
};