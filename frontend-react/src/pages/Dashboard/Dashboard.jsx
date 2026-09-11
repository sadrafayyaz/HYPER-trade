import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000";
const MARKET_WS_URL = "ws://localhost:3000/ws/market";
const TRADING_FEE_RATE = 0.005;

const NETWORKS = {
  1: "Ethereum",
  56: "BNB Chain",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
};

const USDT_CONTRACTS = {
  1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  56: "0x55d398326f99059fF775485246999027B3197955",
  137: "0xc2132D05D31c914a87C6611C10748AaCbC532c6",
  42161: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  10: "0x94b008aA00579c1307B0EF2c499aD98a8ceE58e58",
};

const DEFAULT_MARKET = {
  BTC: { price: null, change24h: null },
  ETH: { price: null, change24h: null },
  SOL: { price: null, change24h: null },
  USDT: { price: null, change24h: null },
  TRX: { price: null, change24h: null },
};

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", accent: "text-orange-400" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", accent: "text-indigo-400" },
  { symbol: "SOL", name: "Solana", icon: "S", accent: "text-purple-400" },
  { symbol: "USDT", name: "Tether", icon: "₮", accent: "text-emerald-400" },
  { symbol: "TRX", name: "TRON", icon: "T", accent: "text-red-400" },
];

const TRADE_PAIRS = [
  { symbol: "BTC", label: "BTC / USDT", base: "BTC", quote: "USDT" },
  { symbol: "ETH", label: "ETH / USDT", base: "ETH", quote: "USDT" },
  { symbol: "SOL", label: "SOL / USDT", base: "SOL", quote: "USDT" },
  { symbol: "TRX", label: "TRX / USDT", base: "TRX", quote: "USDT" },
  {
    symbol: "USDT",
    label: "USDT / IRT",
    base: "USDT",
    quote: "IRT",
    requiresIrt: true,
  },
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];

const CHART_CANDLE_LIMIT = 200;

const SIGNAL_CONFIG = {
  BUY: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500",
  },
  SELL: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500",
  },
  HOLD: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    badge: "bg-yellow-500",
  },
  WAIT: {
    text: "text-zinc-400",
    bg: "bg-zinc-900/70",
    border: "border-zinc-700",
    badge: "bg-zinc-600",
  },
};

const WALLET_DEFINITIONS = [
  {
    id: "metamask",
    name: "MetaMask",
    subtitle: "Browser wallet",
    installUrl: "https://metamask.io/download/",
    matcher: (provider, info) =>
      Boolean(
        provider?.isMetaMask ||
          /metamask/i.test(info?.name || "") ||
          /metamask/i.test(info?.rdns || "")
      ),
  },
  {
    id: "coinomi",
    name: "Coinomi",
    subtitle: "WalletConnect mobile wallet",
    installUrl: "https://www.coinomi.com/downloads/",
    matcher: (provider, info) =>
      Boolean(
        provider?.isCoinomi ||
          provider?.isCoinomiWallet ||
          /coinomi/i.test(info?.name || "") ||
          /coinomi/i.test(info?.rdns || "")
      ),
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    subtitle: "Browser / mobile wallet",
    installUrl: "https://trustwallet.com/download",
    matcher: (provider, info) =>
      Boolean(
        provider?.isTrust ||
          provider?.isTrustWallet ||
          /trust wallet/i.test(info?.name || "") ||
          /trustwallet/i.test(info?.name || "") ||
          /trust/i.test(info?.rdns || "")
      ),
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatPrice(price, symbol = "") {
  const value = Number(price);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (symbol === "USDT") {
    return value.toFixed(4);
  }

  if (value >= 10000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  });
}

function formatChange(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function shortenAddress(address) {
  if (!address) return "—";
  if (address.length <= 14) return address;
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function parseBalance(hex, decimals) {
  try {
    const raw = BigInt(hex || "0x0");
    const divisor = 10n ** BigInt(decimals);
    const whole = raw / divisor;
    const fraction = raw % divisor;

    if (fraction === 0n) {
      return whole.toString();
    }

    return `${whole}.${fraction
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "")}`;
  } catch {
    return "0";
  }
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateEMA(values, period) {
  if (!values.length) return null;

  if (values.length < period) {
    return average(values);
  }

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateSMA(values, period) {
  if (!values.length) return null;
  return average(values.slice(-period));
}

function calculateRSI(values, period = 14) {
  if (values.length < 2) return 50;

  const changes = [];

  for (let index = 1; index < values.length; index += 1) {
    changes.push(values[index] - values[index - 1]);
  }

  const recent = changes.slice(-period);

  if (!recent.length) return 50;

  let gain = 0;
  let loss = 0;

  for (const change of recent) {
    if (change > 0) {
      gain += change;
    } else {
      loss += Math.abs(change);
    }
  }

  if (loss === 0) {
    return gain > 0 ? 100 : 50;
  }

  const rs = gain / loss;

  return 100 - 100 / (1 + rs);
}

function calculateMACD(values) {
  if (values.length < 5) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const macdSeries = [];

  for (let index = 0; index < values.length; index += 1) {
    const partial = values.slice(0, index + 1);
    const ema12 = calculateEMA(partial, 12);
    const ema26 = calculateEMA(partial, 26);

    if (ema12 !== null && ema26 !== null) {
      macdSeries.push(ema12 - ema26);
    }
  }

  const macd = macdSeries.at(-1) ?? 0;
  const signal = calculateEMA(macdSeries, 9) ?? macd;

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

function calculateTrend(values) {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values.at(-1);

  if (!first) return 0;

  return ((last - first) / first) * 100;
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;

  const returns = [];

  for (let index = 1; index < values.length; index += 1) {
    if (!values[index - 1]) continue;

    returns.push(
      (values[index] - values[index - 1]) /
        values[index - 1]
    );
  }

  if (!returns.length) return 0;

  const mean = average(returns);

  const variance = average(
    returns.map((value) => (value - mean) ** 2)
  );

  return Math.sqrt(variance) * 100;
}

function calculateSupportResistance(values) {
  const recent = values.slice(-50);

  if (!recent.length) {
    return {
      support: null,
      resistance: null,
    };
  }

  return {
    support: Math.min(...recent),
    resistance: Math.max(...recent),
  };
}

function calculateSignal(values) {
  if (values.length < 8) {
    return {
      signal: "WAIT",
      confidence: 0,
      score: 0,
      rsi: 50,
      macd: 0,
      macdSignal: 0,
      histogram: 0,
      ema9: null,
      ema21: null,
      sma20: null,
      trend: 0,
      volatility: 0,
      support: values.length ? Math.min(...values) : null,
      resistance: values.length ? Math.max(...values) : null,
      reason: "Waiting for sufficient market history.",
    };
  }

  const ema9 = calculateEMA(values, 9);
  const ema21 = calculateEMA(values, 21);
  const sma20 = calculateSMA(values, 20);
  const rsi = calculateRSI(values, 14);
  const macd = calculateMACD(values);
  const trend = calculateTrend(values.slice(-20));
  const volatility = calculateVolatility(values.slice(-30));
  const levels = calculateSupportResistance(values);

  let score = 0;
  const reasons = [];

  if (ema9 !== null && ema21 !== null) {
    if (ema9 > ema21) {
      score += 25;
      reasons.push("EMA bullish");
    } else if (ema9 < ema21) {
      score -= 25;
      reasons.push("EMA bearish");
    }
  }

  if (macd.macd > macd.signal) {
    score += 20;
    reasons.push("MACD bullish");
  } else if (macd.macd < macd.signal) {
    score -= 20;
    reasons.push("MACD bearish");
  }

  if (rsi >= 55 && rsi <= 70) {
    score += 15;
    reasons.push("RSI momentum bullish");
  } else if (rsi >= 30 && rsi < 45) {
    score -= 15;
    reasons.push("RSI momentum bearish");
  } else if (rsi > 70) {
    score -= 10;
    reasons.push("RSI overbought");
  } else if (rsi < 30) {
    score += 10;
    reasons.push("RSI oversold");
  }

  if (trend > 0.25) {
    score += 20;
    reasons.push("Price trend positive");
  } else if (trend < -0.25) {
    score -= 20;
    reasons.push("Price trend negative");
  }

  if (sma20 !== null) {
    if (values.at(-1) > sma20) {
      score += 10;
    } else if (values.at(-1) < sma20) {
      score -= 10;
    }
  }

  score = clamp(score, -100, 100);

  const signal =
    score >= 35
      ? "BUY"
      : score <= -35
      ? "SELL"
      : "HOLD";

  return {
    signal,
    confidence: Math.abs(score),
    score,
    rsi,
    macd: macd.macd,
    macdSignal: macd.signal,
    histogram: macd.histogram,
    ema9,
    ema21,
    sma20,
    trend,
    volatility,
    support: levels.support,
    resistance: levels.resistance,
    reason:
      reasons.length > 0
        ? reasons.join(" • ")
        : "No strong directional signal.",
  };
}

function createCandleBuckets(history, timeframe) {
  const points = Array.isArray(history) ? history : [];

  if (!points.length) return [];

  const seconds = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1H": 3600,
    "4H": 14400,
    "1D": 86400,
  }[timeframe] || 3600;

  const bucketMs = seconds * 1000;
  const buckets = new Map();

  for (const point of points) {
    const time = safeNumber(point.time, Date.now());
    const price = safeNumber(point.price, 0);

    if (price <= 0) continue;

    const bucketTime =
      Math.floor(time / bucketMs) * bucketMs;

    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        source: "live",
      });
    } else {
      const candle = buckets.get(bucketTime);

      candle.high = Math.max(
        candle.high,
        price
      );

      candle.low = Math.min(
        candle.low,
        price
      );

      candle.close = price;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .slice(-CHART_CANDLE_LIMIT);
}

async function fetchInternalCandles(symbol, timeframe) {
  const token = localStorage.getItem("hypertrade_token");

  if (!token) {
    throw new Error("Authentication required.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${API_URL}/api/signals/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&limit=${CHART_CANDLE_LIMIT}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("hypertrade_token");
      localStorage.removeItem("hypertrade_user");
      throw new Error("Authentication required.");
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Internal candle API returned HTTP ${response.status}.`
      );
    }

    const rows = data?.data?.candles;

    if (!Array.isArray(rows)) {
      throw new Error("Internal candle API returned invalid data.");
    }

    return rows
      .map((row) => ({
        time: Number(row.time),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume || 0),
        quoteVolume: Number(row.quoteVolume || 0),
        trades: Number(row.trades || 0),
        source: row.source || "hyper-trade-internal",
      }))
      .filter(
        (candle) =>
          Number.isFinite(candle.time) &&
          candle.time > 0 &&
          Number.isFinite(candle.open) &&
          candle.open > 0 &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close)
      )
      .slice(-CHART_CANDLE_LIMIT);
  } finally {
    clearTimeout(timeout);
  }
}

function mergeLivePriceIntoCandle(
  candles,
  price,
  timeframe,
  now = Date.now()
) {
  if (!Array.isArray(candles) || !candles.length) {
    return candles;
  }

  const seconds = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1H": 3600,
    "4H": 14400,
    "1D": 86400,
  }[timeframe] || 3600;

  const bucketMs = seconds * 1000;
  const bucketTime =
    Math.floor(now / bucketMs) * bucketMs;

  const last = candles[candles.length - 1];

  if (!last) return candles;

  if (bucketTime < last.time) {
    return candles;
  }

  if (bucketTime === last.time) {
    if (Number(last.close) === price) {
      return candles;
    }

    return [
      ...candles.slice(0, -1),
      {
        ...last,
        high: Math.max(
          Number(last.high),
          price
        ),
        low: Math.min(
          Number(last.low),
          price
        ),
        close: price,
      },
    ];
  }

  const next = {
    time: bucketTime,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 0,
    quoteVolume: 0,
    trades: 0,
    source: "live",
  };

  return [
    ...candles,
    next,
  ].slice(-CHART_CANDLE_LIMIT);
}

function candlePricePath(
  candles,
  key,
  min,
  range
) {
  if (!candles.length) return "";

  return candles
    .map((candle, index) => {
      const x =
        candles.length === 1
          ? 50
          : (index / (candles.length - 1)) *
            100;

      const value = Number(candle[key]);

      const y = clamp(
        100 -
          ((value - min) / range) * 100,
        2,
        98
      );

      return `${x},${y}`;
    })
    .join(" ");
}

function svgPathFromPrices(
  values,
  min,
  range
) {
  if (values.length < 2) {
    return "0,50 100,50";
  }

  return values
    .map((price, index) => {
      const x =
        values.length === 1
          ? 50
          : (index /
              (values.length - 1)) *
            100;

      const y = clamp(
        100 -
          ((price - min) / range) * 100,
        2,
        98
      );

      return `${x},${y}`;
    })
    .join(" ");
}

function ExternalWalletLogo({ id }) {
  if (id === "metamask") {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
        <svg
          width="38"
          height="38"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M32 5 10 18l6 25 10 10 6-4 6 4 10-10 6-25L32 5Z"
            fill="#F6851B"
          />

          <path
            d="m19 27 7-8 6 8-8 5-5-5Zm26 0-7-8-6 8 8 5 5-5Z"
            fill="#fff"
            opacity=".9"
          />

          <path
            d="m20 35 8-1 4 4 4-4 8 1-12 9-12-9Z"
            fill="#E2761B"
          />
        </svg>
      </div>
    );
  }

  if (id === "coinomi") {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-xl font-black text-white">
          C
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
      <svg
        width="38"
        height="38"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M32 6c14.36 0 26 11.64 26 26S46.36 58 32 58 6 46.36 6 32 17.64 6 32 6Z"
          fill="#3375BB"
        />

        <path
          d="M32 15c-6.5 8.1-11 13.8-11 19.2a11 11 0 0 0 22 0C43 28.8 38.5 23.1 32 15Z"
          fill="#fff"
        />
      </svg>
    </div>
  );
}

function SignalBadge({
  signal,
  confidence,
}) {
  const config =
    SIGNAL_CONFIG[signal] ||
    SIGNAL_CONFIG.WAIT;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${config.bg} ${config.border}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${config.badge}`}
      />

      <span
        className={`font-bold ${config.text}`}
      >
        {signal}
      </span>

      {typeof confidence ===
        "number" && (
        <span className="text-xs text-zinc-400">
          {Math.round(
            confidence
          )}
          %
        </span>
      )}
    </span>
  );
}

function ProfessionalMarketChart({
  candles,
  selectedPair,
  selectedTimeframe,
  chartType,
  setChartType,
  chartLoading,
  chartSource,
  signalData,
  liveOrderBook,
  liveTimeSales,
}) {
  const [visibleCount, setVisibleCount] = useState(90);
  const [viewEnd, setViewEnd] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [activeTool, setActiveTool] = useState("cursor");
  const [horizontalLines, setHorizontalLines] = useState([]);
  const [trendLines, setTrendLines] = useState([]);
  const [drawingTrend, setDrawingTrend] = useState(null);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [showTimeSales, setShowTimeSales] = useState(false);
  const dragRef = useRef({ startX: 0, startEnd: 0 });

  const total = candles.length;
  const effectiveEnd = viewEnd === null ? total : Math.min(viewEnd, total);
  const start = Math.max(0, effectiveEnd - visibleCount);
  const visible = candles.slice(start, effectiveEnd);

  const firstVisible = visible[0] || null;
  const lastVisible = visible.at(-1) || null;
  const hovered = hoveredIndex === null ? lastVisible : visible[hoveredIndex];

  const highs = visible.map((c) => Number(c.high)).filter(Number.isFinite);
  const lows = visible.map((c) => Number(c.low)).filter(Number.isFinite);
  const maxPrice = highs.length ? Math.max(...highs) : 0;
  const minPrice = lows.length ? Math.min(...lows) : 0;
  const range = Math.max(maxPrice - minPrice, maxPrice * 0.002, 1);

  const plotHeight = 330;
  const volumeHeight = 86;
  const plotWidth = 1000;
  const yPad = 18;

  const priceToY = useCallback(
    (price) => {
      if (!Number.isFinite(Number(price)) || !range) {
        return plotHeight / 2;
      }
      return yPad + (1 - (Number(price) - minPrice) / range) * (plotHeight - yPad * 2);
    },
    [minPrice, range]
  );

  const xForIndex = useCallback(
    (index) => {
      if (visible.length <= 1) return plotWidth / 2;
      return 12 + (index / (visible.length - 1)) * (plotWidth - 24);
    },
    [visible.length]
  );

  const volumeMax = Math.max(
    ...visible.map((c) => Number(c.volume) || 0),
    1
  );

  const emaSeries = useMemo(() => {
    const closeValues = visible.map((c) => Number(c.close)).filter(Number.isFinite);
    const build = (period) => {
      const values = [];
      for (let i = 0; i < closeValues.length; i += 1) {
        values.push(calculateEMA(closeValues.slice(0, i + 1), period));
      }
      return values;
    };

    return {
      ema9: build(9),
      ema21: build(21),
    };
  }, [visible]);

  const makePath = useCallback(
    (values) => {
      if (!values.length) return "";

      return values
        .map((value, index) => {
          const x = xForIndex(index);
          const y = priceToY(value);
          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
    },
    [priceToY, xForIndex]
  );

  const linePath = makePath(
    visible.map((c) => Number(c.close)).filter(Number.isFinite)
  );

  const ema9Path = makePath(emaSeries.ema9);
  const ema21Path = makePath(emaSeries.ema21);

  const gridLevels = Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6;
    return {
      y: yPad + ratio * (plotHeight - yPad * 2),
      price: maxPrice - ratio * range,
    };
  });

  const timeLabels = useMemo(() => {
    if (!visible.length) return [];

    const count = Math.min(8, visible.length);
    const step = visible.length <= count ? 1 : (visible.length - 1) / (count - 1);

    return Array.from({ length: count }, (_, i) => {
      const index = Math.round(i * step);
      const candle = visible[index];

      return {
        index,
        label: formatDate(candle.time),
      };
    });
  }, [visible]);

  const updateZoom = useCallback(
    (direction) => {
      if (!total) return;

      const nextCount =
        direction < 0
          ? Math.min(total, visibleCount + 10)
          : Math.max(25, visibleCount - 10);

      setVisibleCount(nextCount);
      setViewEnd((current) =>
        current === null
          ? null
          : Math.min(total, Math.max(nextCount, current))
      );
    },
    [total, visibleCount]
  );

  const resetView = useCallback(() => {
    setVisibleCount(90);
    setViewEnd(null);
    setHoveredIndex(null);
    setHorizontalLines([]);
    setTrendLines([]);
    setDrawingTrend(null);
    setActiveTool("cursor");
  }, []);

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      updateZoom(event.deltaY > 0 ? -1 : 1);
    },
    [updateZoom]
  );

  const priceFromClientY = useCallback(
    (clientY, rect) => {
      const y = Math.max(
        0,
        Math.min(
          plotHeight,
          clientY - rect.top
        )
      );

      return minPrice +
        (1 - y / plotHeight) * range;
    },
    [minPrice, range]
  );

  const pointFromClient = useCallback(
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = Math.max(
        0,
        Math.min(
          rect.width,
          event.clientX - rect.left
        )
      );

      const index = Math.max(
        0,
        Math.min(
          Math.max(visible.length - 1, 0),
          Math.round(
            (relativeX / Math.max(rect.width, 1)) *
              Math.max(visible.length - 1, 0)
          )
        )
      );

      return {
        index,
        price: priceFromClientY(event.clientY, rect),
      };
    },
    [priceFromClientY, visible.length]
  );

  const onPointerDown = useCallback(
    (event) => {
      if (activeTool === "horizontal") {
        const point = pointFromClient(event);

        setHorizontalLines((previous) => [
          ...previous,
          {
            id: `${Date.now()}-${Math.random()}`,
            price: point.price,
          },
        ]);

        return;
      }

      if (activeTool === "trendline") {
        const point = pointFromClient(event);
        setDrawingTrend(point);
        return;
      }

      setDragging(true);
      dragRef.current = {
        startX: event.clientX,
        startEnd: effectiveEnd,
      };
    },
    [activeTool, pointFromClient, effectiveEnd]
  );

  const onPointerMove = useCallback(
    (event) => {
      if (activeTool === "trendline" && drawingTrend) {
        return;
      }

      if (!dragging) return;

      const delta = event.clientX - dragRef.current.startX;
      const shift = Math.round(
        (delta / Math.max(event.currentTarget.clientWidth, 1)) * visible.length
      );

      const nextEnd = Math.max(
        visibleCount,
        Math.min(
          total,
          dragRef.current.startEnd - shift
        )
      );

      setViewEnd(
        nextEnd >= total
          ? null
          : nextEnd
      );
    },
    [activeTool, drawingTrend, dragging, total, visible.length, visibleCount]
  );

  const onPointerUp = useCallback(
    (event) => {
      if (activeTool === "trendline" && drawingTrend) {
        const point = pointFromClient(event);

        if (
          Number.isFinite(drawingTrend.price) &&
          Number.isFinite(point.price)
        ) {
          setTrendLines((previous) => [
            ...previous,
            {
              id: `${Date.now()}-${Math.random()}`,
              startIndex: drawingTrend.index,
              startPrice: drawingTrend.price,
              endIndex: point.index,
              endPrice: point.price,
            },
          ]);
        }

        setDrawingTrend(null);
        return;
      }

      setDragging(false);
    },
    [activeTool, drawingTrend, pointFromClient]
  );

  const onPointerLeave = useCallback(() => {
    setDragging(false);
    setDrawingTrend(null);
  }, []);

  useEffect(() => {
    if (viewEnd !== null && viewEnd > total) {
      setViewEnd(null);
    }
  }, [total, viewEnd]);

  const hoverX = hoveredIndex === null ? null : xForIndex(hoveredIndex);
  const hoverY = hovered ? priceToY(Number(hovered.close)) : null;

  const orderBook = useMemo(() => {
    const bids = Array.isArray(liveOrderBook?.bids)
      ? liveOrderBook.bids
      : [];

    const asks = Array.isArray(liveOrderBook?.asks)
      ? liveOrderBook.asks
      : [];

    return {
      bids,
      asks,
      bestBid: liveOrderBook?.bestBid ?? null,
      bestAsk: liveOrderBook?.bestAsk ?? null,
      spread: liveOrderBook?.spread ?? null,
      spreadPercent:
        liveOrderBook?.spreadPercent ?? null,
    };
  }, [liveOrderBook]);

  const volumeProfile = useMemo(() => {
    if (!visible.length) return [];

    const bins = 18;
    const binSize = range / bins;
    const values = Array.from(
      { length: bins },
      (_, index) => ({
        index,
        price: minPrice + (index + 0.5) * binSize,
        volume: 0,
      })
    );

    visible.forEach((candle) => {
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const rawVolume = Number(candle.volume) || 0;
      const fallbackActivity = Math.max(
        Math.abs(high - low),
        close * 0.00015
      );
      const weight = rawVolume > 0 ? rawVolume : fallbackActivity;
      const mid = (high + low + close) / 3;
      const index = Math.max(
        0,
        Math.min(
          bins - 1,
          Math.floor((mid - minPrice) / binSize)
        )
      );

      values[index].volume += weight;
    });

    const max = Math.max(
      ...values.map((item) => item.volume),
      1
    );

    return values.map((item) => ({
      ...item,
      ratio: item.volume / max,
    }));
  }, [visible, minPrice, range]);

  const timeSales = useMemo(() => {
    return Array.isArray(liveTimeSales?.trades)
      ? liveTimeSales.trades
      : [];
  }, [liveTimeSales]);

  const toolButtons = [
    ["cursor", "Cursor"],
    ["horizontal", "Horizontal"],
    ["trendline", "Trendline"],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0A0F1E]">
      <div className="border-b border-zinc-800 bg-[#080D1A] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black">
                {selectedPair}/USDT
              </h3>

              <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                Internal Market
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span>
                O {hovered ? formatPrice(hovered.open, selectedPair) : "—"}
              </span>
              <span>
                H {hovered ? formatPrice(hovered.high, selectedPair) : "—"}
              </span>
              <span>
                L {hovered ? formatPrice(hovered.low, selectedPair) : "—"}
              </span>
              <span>
                C {hovered ? formatPrice(hovered.close, selectedPair) : "—"}
              </span>
              {hovered?.volume ? (
                <span>
                  Vol {Number(hovered.volume).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map((timeframe) => (
              <button
                key={timeframe}
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent(
                      "hypertrade:timeframe",
                      { detail: timeframe }
                    )
                  )
                }
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  selectedTimeframe === timeframe
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["candle", "Candles"],
              ["line", "Line"],
              ["signals", "Signal Chart"],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setChartType(type)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  chartType === type
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {toolButtons.map(([tool, label]) => (
              <button
                key={tool}
                type="button"
                onClick={() => setActiveTool(tool)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  activeTool === tool
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowVolumeProfile((value) => !value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                showVolumeProfile
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white"
              }`}
            >
              Volume Profile
            </button>

            <button
              type="button"
              onClick={() => setShowOrderBook((value) => !value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                showOrderBook
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white"
              }`}
            >
              Order Book
            </button>

            <button
              type="button"
              onClick={() => setShowTimeSales((value) => !value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                showTimeSales
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white"
              }`}
            >
              Time & Sales
            </button>

            <button
              type="button"
              onClick={() => updateZoom(1)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-white"
              title="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => updateZoom(-1)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 hover:text-white"
              title="Zoom out"
            >
              −
            </button>

            <button
              type="button"
              onClick={resetView}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-zinc-600">
          <span>
            Drawing tool: {activeTool}
          </span>
          <span>
            Click Horizontal to place a price level · drag Trendline to draw
          </span>
          <span>
            {visible.length} visible candles
          </span>
        </div>
      </div>

      <div
        className={`relative select-none bg-[#060A14] ${
          dragging
            ? "cursor-grabbing"
            : activeTool === "cursor"
              ? "cursor-crosshair"
              : "cursor-cell"
        }`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (visible.length > 0) {
            const rect = event.currentTarget.getBoundingClientRect();
            const relativeX = Math.max(
              0,
              Math.min(
                rect.width,
                event.clientX - rect.left
              )
            );
            const index = Math.round(
              (relativeX / Math.max(rect.width, 1)) *
                Math.max(visible.length - 1, 0)
            );
            setHoveredIndex(index);
          }

          onPointerMove(event);
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <div className="relative h-[430px] p-3">
          <svg
            viewBox={`0 0 ${plotWidth} ${plotHeight}`}
            preserveAspectRatio="none"
            className="absolute left-3 right-3 top-3 h-[calc(100%-24px)] w-[calc(100%-24px)]"
          >
            {gridLevels.map((level) => (
              <g key={`grid-${level.y}`}>
                <line
                  x1="0"
                  x2={plotWidth}
                  y1={level.y}
                  y2={level.y}
                  stroke="#171D2B"
                  strokeWidth="1"
                />
                <text
                  x={plotWidth - 2}
                  y={level.y - 3}
                  textAnchor="end"
                  fill="#525A6A"
                  fontSize="11"
                >
                  {formatPrice(level.price, selectedPair)}
                </text>
              </g>
            ))}

            {timeLabels.map((item) => {
              const x = xForIndex(item.index);

              return (
                <line
                  key={`v-${item.index}`}
                  x1={x}
                  x2={x}
                  y1="0"
                  y2={plotHeight}
                  stroke="#111827"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />
              );
            })}

            {chartType !== "candle" && linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke={chartType === "signals" ? "#60a5fa" : "#34d399"}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {chartType !== "line" ? (
              <>
                {ema9Path ? (
                  <path
                    d={ema9Path}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    opacity="0.9"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}

                {ema21Path ? (
                  <path
                    d={ema21Path}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="1.2"
                    opacity="0.9"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </>
            ) : null}

            {chartType === "candle" &&
              visible.map((candle, index) => {
                const open = Number(candle.open);
                const high = Number(candle.high);
                const low = Number(candle.low);
                const close = Number(candle.close);
                const x = xForIndex(index);
                const bullish = close >= open;
                const width = Math.max(
                  2,
                  Math.min(
                    12,
                    ((plotWidth - 24) /
                      Math.max(visible.length, 1)) *
                      0.62
                  )
                );

                const yOpen = priceToY(open);
                const yClose = priceToY(close);
                const yHigh = priceToY(high);
                const yLow = priceToY(low);
                const bodyTop = Math.min(
                  yOpen,
                  yClose
                );
                const bodyHeight = Math.max(
                  2,
                  Math.abs(yClose - yOpen)
                );
                const candleColor = bullish
                  ? "#22c55e"
                  : "#ef4444";

                return (
                  <g key={`${candle.time}-${index}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={yHigh}
                      y2={yLow}
                      stroke={candleColor}
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />

                    <rect
                      x={x - width / 2}
                      y={bodyTop}
                      width={width}
                      height={bodyHeight}
                      rx="1"
                      fill={candleColor}
                    />
                  </g>
                );
              })}

            {horizontalLines.map((item) => (
              <g key={item.id}>
                <line
                  x1="0"
                  x2={plotWidth}
                  y1={priceToY(item.price)}
                  y2={priceToY(item.price)}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="7 5"
                />
                <text
                  x="5"
                  y={priceToY(item.price) - 5}
                  fill="#7dd3fc"
                  fontSize="11"
                >
                  {formatPrice(item.price, selectedPair)}
                </text>
              </g>
            ))}

            {trendLines.map((item) => (
              <line
                key={item.id}
                x1={xForIndex(item.startIndex)}
                y1={priceToY(item.startPrice)}
                x2={xForIndex(item.endIndex)}
                y2={priceToY(item.endPrice)}
                stroke="#c084fc"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {drawingTrend ? (
              <line
                x1={xForIndex(drawingTrend.index)}
                y1={priceToY(drawingTrend.price)}
                x2={xForIndex(hoveredIndex ?? drawingTrend.index)}
                y2={
                  hoverY ??
                  priceToY(drawingTrend.price)
                }
                stroke="#c084fc"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {chartType === "signals" && signalData ? (
              <>
                {signalData.support ? (
                  <line
                    x1="0"
                    x2={plotWidth}
                    y1={priceToY(signalData.support)}
                    y2={priceToY(signalData.support)}
                    stroke="#34d399"
                    strokeWidth="1"
                    strokeDasharray="6 5"
                  />
                ) : null}

                {signalData.resistance ? (
                  <line
                    x1="0"
                    x2={plotWidth}
                    y1={priceToY(signalData.resistance)}
                    y2={priceToY(signalData.resistance)}
                    stroke="#f87171"
                    strokeWidth="1"
                    strokeDasharray="6 5"
                  />
                ) : null}
              </>
            ) : null}

            {hoverX !== null && hoverY !== null ? (
              <>
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1="0"
                  y2={plotHeight}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                <line
                  x1="0"
                  x2={plotWidth}
                  y1={hoverY}
                  y2={hoverY}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                <circle
                  cx={hoverX}
                  cy={hoverY}
                  r="4"
                  fill="#fff"
                  stroke="#60a5fa"
                  strokeWidth="2"
                />
              </>
            ) : null}
          </svg>

          <div className="pointer-events-none absolute right-4 top-3 bottom-3 flex w-20 flex-col justify-between py-1 text-right text-[10px] font-mono text-zinc-700">
            {gridLevels.map((level) => (
              <span key={`axis-${level.y}`}>
                {formatPrice(level.price, selectedPair)}
              </span>
            ))}
          </div>

          {hovered && hoveredIndex !== null ? (
            <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-zinc-700 bg-[#070B14]/95 px-3 py-2 text-[10px] shadow-xl backdrop-blur">
              <p className="font-semibold text-zinc-400">
                {formatDate(hovered.time)}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-zinc-300">
                <span>
                  O {formatPrice(hovered.open, selectedPair)}
                </span>
                <span>
                  H {formatPrice(hovered.high, selectedPair)}
                </span>
                <span>
                  L {formatPrice(hovered.low, selectedPair)}
                </span>
                <span>
                  C {formatPrice(hovered.close, selectedPair)}
                </span>
              </div>
            </div>
          ) : null}

          {chartLoading ? (
            <div className="absolute left-5 top-5 rounded-xl border border-zinc-800 bg-[#050816]/90 px-3 py-2 text-xs text-zinc-500">
              Loading internal market data...
            </div>
          ) : null}

          {signalData?.signal ? (
            <div className="absolute right-24 top-5 rounded-xl border border-zinc-800 bg-[#050816]/90 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Signal
              </p>

              <p
                className={`mt-1 text-lg font-black ${
                  signalData.signal === "BUY"
                    ? "text-emerald-400"
                    : signalData.signal === "SELL"
                      ? "text-red-400"
                      : signalData.signal === "WAIT"
                        ? "text-zinc-400"
                        : "text-yellow-400"
                }`}
              >
                {signalData.signal}
              </p>
            </div>
          ) : null}
        </div>

        <div className="relative h-[86px] border-t border-zinc-900 bg-[#050914]">
          <div className="absolute inset-0 flex items-end gap-[1px] px-1 py-2 pr-20">
            {visible.map((candle, index) => {
              const volume = Number(candle.volume) || 0;
              const fallbackVolume = Math.max(
                1,
                Math.abs(
                  Number(candle.high) -
                    Number(candle.low)
                )
              );
              const effectiveVolume =
                volume > 0
                  ? volume
                  : fallbackVolume;
              const max = Math.max(
                ...visible.map((item) =>
                  Number(item.volume) > 0
                    ? Number(item.volume)
                    : Math.max(
                        1,
                        Math.abs(
                          Number(item.high) -
                            Number(item.low)
                        )
                      )
                ),
                1
              );
              const height = Math.max(
                1,
                (effectiveVolume / max) * 58
              );
              const bullish =
                Number(candle.close) >=
                Number(candle.open);

              return (
                <div
                  key={`volume-${candle.time}-${index}`}
                  className="flex-1"
                  style={{
                    height: `${height}px`,
                  }}
                >
                  <div
                    className={`h-full rounded-t-sm ${
                      bullish
                        ? "bg-emerald-500/35"
                        : "bg-red-500/35"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute left-3 top-2 text-[10px] uppercase tracking-wider text-zinc-700">
            Volume
          </div>
        </div>

        <div className="relative h-9 bg-[#060A14]">
          {timeLabels.map((item) => {
            const x = xForIndex(item.index);

            return (
              <span
                key={`label-${item.index}`}
                className="absolute top-2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-zinc-700"
                style={{
                  left: `${(x / plotWidth) * 100}%`,
                }}
              >
                {item.label}
              </span>
            );
          })}
        </div>
      </div>

      {(showVolumeProfile || showOrderBook || showTimeSales) && (
        <div className="grid gap-4 border-t border-zinc-800 bg-[#080D1A] p-4 xl:grid-cols-3">
          {showVolumeProfile && (
            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-600">
                    Volume Profile
                  </p>
                  <p className="mt-1 text-sm font-black text-zinc-300">
                    Price Distribution
                  </p>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {selectedTimeframe}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                {volumeProfile.map((item) => (
                  <div
                    key={`profile-${item.index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="w-20 text-[9px] font-mono text-zinc-600">
                      {formatPrice(
                        item.price,
                        selectedPair
                      )}
                    </span>

                    <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-900">
                      <div
                        className="h-full rounded bg-purple-500/60"
                        style={{
                          width: `${Math.max(
                            2,
                            item.ratio * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showOrderBook && (
            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-600">
                    Order Book
                  </p>
                  <p className="mt-1 text-sm font-black text-zinc-300">
                    Internal Depth
                  </p>
                </div>

                <span className="rounded-md bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-300">
                  Internal
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 text-[9px] uppercase tracking-wider text-zinc-700">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
              </div>

              <div className="mt-2 space-y-1">
                {orderBook.asks.map((level) => (
                  <div
                    key={`ask-${level.price}`}
                    className="grid grid-cols-3 text-[10px] font-mono"
                  >
                    <span className="text-red-400">
                      {formatPrice(
                        level.price,
                        selectedPair
                      )}
                    </span>
                    <span className="text-right text-zinc-400">
                      {level.size.toFixed(4)}
                    </span>
                    <span className="text-right text-zinc-600">
                      {level.total.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="my-3 rounded-lg bg-zinc-900 px-3 py-2 text-center font-mono text-sm font-black text-white">
                {formatPrice(
                  lastVisible?.close,
                  selectedPair
                )}
              </div>

              <div className="space-y-1">
                {orderBook.bids.map((level) => (
                  <div
                    key={`bid-${level.price}`}
                    className="grid grid-cols-3 text-[10px] font-mono"
                  >
                    <span className="text-emerald-400">
                      {formatPrice(
                        level.price,
                        selectedPair
                      )}
                    </span>
                    <span className="text-right text-zinc-400">
                      {level.size.toFixed(4)}
                    </span>
                    <span className="text-right text-zinc-600">
                      {level.total.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTimeSales && (
            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-600">
                    Time & Sales
                  </p>
                  <p className="mt-1 text-sm font-black text-zinc-300">
                    Recent Internal Prints
                  </p>
                </div>

                <span className="text-[10px] text-zinc-600">
                  {timeSales.length} prints
                </span>
              </div>

              <div className="mt-4 grid grid-cols-4 text-[9px] uppercase tracking-wider text-zinc-700">
                <span>Time</span>
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Size</span>
              </div>

              <div className="mt-2 space-y-1">
                {timeSales.map((trade) => (
                  <div
                    key={trade.id}
                    className="grid grid-cols-4 text-[10px] font-mono"
                  >
                    <span className="text-zinc-600">
                      {new Date(
                        trade.time
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>

                    <span
                      className={
                        trade.side === "BUY"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {trade.side}
                    </span>

                    <span className="text-right text-zinc-300">
                      {formatPrice(
                        trade.price,
                        selectedPair
                      )}
                    </span>

                    <span className="text-right text-zinc-500">
                      {Number(
                        trade.size
                      ).toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-zinc-800 bg-[#080D1A] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-zinc-600">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Source:{" "}
              <strong className="font-semibold text-zinc-400">
                {chartSource}
              </strong>
            </span>

            <span>
              Candles:{" "}
              <strong className="font-semibold text-zinc-400">
                {visible.length}
              </strong>
            </span>

            <span>
              Drag to pan · Wheel to zoom
            </span>
          </div>

          <span>
            Independent Hyper Trade chart
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const mountedRef =
    useRef(false);

  const wsRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const reconnectAttemptRef =
    useRef(0);

  const walletProviderRefs =
    useRef({});

  const eip6963ProvidersRef =
    useRef([]);

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [market, setMarket] =
    useState(DEFAULT_MARKET);

  const [
    marketConnected,
    setMarketConnected,
  ] = useState(false);

  const [chartHistory, setChartHistory] =
    useState({});

  const [chartCandles, setChartCandles] =
    useState([]);

  const [chartLoading, setChartLoading] =
    useState(false);

  const [chartSource, setChartSource] =
    useState("live");

  const [liveOrderBook, setLiveOrderBook] =
    useState({
      symbol: "BTC/USDT",
      bids: [],
      asks: [],
      bestBid: null,
      bestAsk: null,
      spread: null,
      spreadPercent: null,
    });

  const [liveTimeSales, setLiveTimeSales] =
    useState({
      symbol: "BTC/USDT",
      trades: [],
    });

  const [selectedPair, setSelectedPair] =
    useState("BTC");

  const [
    selectedTimeframe,
    setSelectedTimeframe,
  ] = useState("1H");

  const [chartType, setChartType] =
    useState("candle");

  useEffect(() => {
    const handler = (event) => {
      if (TIMEFRAMES.includes(event.detail)) {
        setSelectedTimeframe(event.detail);
      }
    };

    window.addEventListener("hypertrade:timeframe", handler);

    return () => {
      window.removeEventListener("hypertrade:timeframe", handler);
    };
  }, []);

  const [orderSide, setOrderSide] =
    useState("buy");

  const [orderType, setOrderType] =
    useState("market");

  const [orderAmount, setOrderAmount] =
    useState("");

  const [limitPrice, setLimitPrice] =
    useState("");

  const [
    orderSubmitting,
    setOrderSubmitting,
  ] = useState(false);

  const [orderHistory, setOrderHistory] =
    useState([]);

  const [
    signalEnabled,
    setSignalEnabled,
  ] = useState(true);

  const [
    previousSignals,
    setPreviousSignals,
  ] = useState({});

  const [signalAlert, setSignalAlert] =
    useState(null);

  const [
    showSignalDetails,
    setShowSignalDetails,
  ] = useState(true);

  const [signalDataOverride, setSignalDataOverride] =
    useState(null);

  const [
    walletLoading,
    setWalletLoading,
  ] = useState(false);

  const [walletError, setWalletError] =
    useState("");

  const [walletType, setWalletType] =
    useState("");

  const [walletAddress, setWalletAddress] =
    useState("");

  const [networkName, setNetworkName] =
    useState("");

  const [ethBalance, setEthBalance] =
    useState(null);

  const [usdtBalance, setUsdtBalance] =
    useState(null);

  const [
    externalWallets,
    setExternalWallets,
  ] = useState({
    metamask: {
      connected: false,
      address: "",
      balance: null,
      network: "",
    },

    coinomi: {
      connected: false,
      address: "",
      balance: null,
      network: "",
    },

    trustwallet: {
      connected: false,
      address: "",
      balance: null,
      network: "",
    },
  });

  const [activeWallet, setActiveWallet] =
    useState("");

  const [
    internalWallet,
    setInternalWallet,
  ] = useState({
    rialBalance: "0",
    btcBalance: "0",
    ethBalance: "0",
    solBalance: "0",
    trxBalance: "0",
    usdtBalance: "0",
  });

  const [notification, setNotification] =
    useState(null);

  const showNotification =
    useCallback(
      (type, message) => {
        if (!mountedRef.current) return;
        setNotification({
          type,
          message,
        });
      },
      []
    );

  const loadOrders =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "hypertrade_token"
        );

      if (!token) return;

      try {
        const response =
          await fetch(
            `${API_URL}/api/orders`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response
            .json()
            .catch(() => ({}));

        const list =
          Array.isArray(
            data?.data
          )
            ? data.data
            : [];

        if (
          mountedRef.current
        ) {
          setOrderHistory(
            list
          );
        }
      } catch (error) {
        console.error(
          "Order history error:",
          error
        );
      }
    }, []);

  const loadDashboard =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "hypertrade_token"
        );

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/dashboard`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "hypertrade_token"
          );

          localStorage.removeItem(
            "hypertrade_user"
          );

          navigate("/");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to load dashboard."
          );
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        setDashboard(
          data?.data || null
        );

        const wallet =
          data?.data?.wallet;

        if (
          wallet &&
          typeof wallet ===
            "object"
        ) {
          setInternalWallet(
            (previous) => ({
              ...previous,
              ...wallet,
            })
          );
        }
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );

        if (
          mountedRef.current
        ) {
          setPageError(
            error.message ||
              "Unable to load dashboard."
          );
        }
      } finally {
        if (
          mountedRef.current
        ) {
          setLoading(false);
        }
      }
    }, [navigate]);

  const loadMarketMicrostructure =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "hypertrade_token"
        );

      if (!token) {
        return;
      }

      try {
        const encodedSymbol =
          encodeURIComponent(
            `${selectedPair}/USDT`
          );

        const [bookResponse, tradesResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/api/orderbook/${encodedSymbol}?limit=20`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),
            fetch(
              `${API_URL}/api/orderbook/${encodedSymbol}/trades?limit=50`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),
          ]);

        const bookData =
          await bookResponse
            .json()
            .catch(() => ({}));

        const tradesData =
          await tradesResponse
            .json()
            .catch(() => ({}));

        if (
          bookResponse.status === 401 ||
          tradesResponse.status === 401
        ) {
          localStorage.removeItem(
            "hypertrade_token"
          );
          localStorage.removeItem(
            "hypertrade_user"
          );
          navigate("/");
          return;
        }

        if (
          bookResponse.ok &&
          bookData?.success &&
          mountedRef.current
        ) {
          setLiveOrderBook(
            bookData.data || {
              symbol:
                `${selectedPair}/USDT`,
              bids: [],
              asks: [],
            }
          );
        }

        if (
          tradesResponse.ok &&
          tradesData?.success &&
          mountedRef.current
        ) {
          setLiveTimeSales(
            tradesData.data || {
              symbol:
                `${selectedPair}/USDT`,
              trades: [],
            }
          );
        }
      } catch (error) {
        console.error(
          "Market microstructure error:",
          error
        );
      }
    }, [
      navigate,
      selectedPair,
    ]);

  const disconnectMarketSocket =
    useCallback(() => {
      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current =
          null;
      }

      reconnectAttemptRef.current =
        0;

      const socket =
        wsRef.current;

      wsRef.current = null;

      if (!socket) return;

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      try {
        if (
          socket.readyState ===
            WebSocket.OPEN ||
          socket.readyState ===
            WebSocket.CONNECTING
        ) {
          socket.close(
            1000,
            "Dashboard cleanup"
          );
        }
      } catch {}
    }, []);

  const scheduleMarketReconnect =
    useCallback(() => {
      if (!mountedRef.current)
        return;

      if (
        reconnectTimerRef.current
      ) {
        return;
      }

      const attempt =
        reconnectAttemptRef.current;

      const delay = Math.min(
        3000 *
          Math.pow(
            1.5,
            attempt
          ),
        30000
      );

      reconnectAttemptRef.current =
        attempt + 1;

      reconnectTimerRef.current =
        setTimeout(() => {
          reconnectTimerRef.current =
            null;

          if (
            mountedRef.current
          ) {
            connectMarketWebSocket();
          }
        }, delay);
    }, []);

  const connectMarketWebSocket =
    useCallback(() => {
      if (!mountedRef.current)
        return;

      const current =
        wsRef.current;

      if (
        current &&
        (current.readyState ===
          WebSocket.OPEN ||
          current.readyState ===
            WebSocket.CONNECTING)
      ) {
        return;
      }

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current =
          null;
      }

      let socket;

      try {
        socket =
          new WebSocket(
            MARKET_WS_URL
          );

        wsRef.current =
          socket;

        socket.onopen = () => {
          if (
            !mountedRef.current
          ) {
            try {
              socket.close();
            } catch {}

            return;
          }

          reconnectAttemptRef.current =
            0;

          setMarketConnected(
            true
          );

          console.log(
            "📡 Hyper Trade Market WebSocket connected"
          );
        };

        socket.onmessage = (
          event
        ) => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          try {
            const message =
              JSON.parse(
                event.data
              );

            const incoming =
              message?.data ||
              message;

            if (
              !incoming ||
              typeof incoming !==
                "object"
            ) {
              return;
            }

            if (
              message?.type ===
              "orderbook"
            ) {
              if (
                mountedRef.current &&
                message?.data &&
                typeof message.data ===
                  "object"
              ) {
                setLiveOrderBook(
                  message.data[
                    `${selectedPair}/USDT`
                  ] || {
                    symbol:
                      `${selectedPair}/USDT`,
                    bids: [],
                    asks: [],
                    bestBid: null,
                    bestAsk: null,
                    spread: null,
                    spreadPercent:
                      null,
                  }
                );
              }

              return;
            }

            if (
              message?.type ===
              "time_and_sales"
            ) {
              if (
                mountedRef.current &&
                message?.data &&
                typeof message.data ===
                  "object"
              ) {
                setLiveTimeSales(
                  message.data[
                    `${selectedPair}/USDT`
                  ] || {
                    symbol:
                      `${selectedPair}/USDT`,
                    trades: [],
                  }
                );
              }

              return;
            }

            setMarket(
              (previous) => {
                const next = {
                  ...previous,
                };

                for (
                  const symbol of
                    Object.keys(
                      DEFAULT_MARKET
                    )
                ) {
                  if (
                    incoming[
                      symbol
                    ]
                  ) {
                    next[symbol] = {
                      ...previous[
                        symbol
                      ],
                      ...incoming[
                        symbol
                      ],
                    };
                  }
                }

                return next;
              }
            );

            for (
              const symbol of
                Object.keys(
                  DEFAULT_MARKET
                )
            ) {
              const price =
                Number(
                  incoming?.[
                    symbol
                  ]?.price
                );

              if (
                !Number.isFinite(
                  price
                ) ||
                price <= 0
              ) {
                continue;
              }

              setChartHistory(
                (previous) => {
                  const old =
                    Array.isArray(
                      previous[
                        symbol
                      ]
                    )
                      ? previous[
                          symbol
                        ]
                      : [];

                  const last =
                    old.at(-1);

                  if (
                    last &&
                    Number(
                      last.price
                    ) === price
                  ) {
                    return previous;
                  }

                  return {
                    ...previous,
                    [symbol]: [
                      ...old,
                      {
                        time:
                          Date.now(),
                        price,
                      },
                    ].slice(
                      -600
                    ),
                  };
                }
              );
            }
          } catch (
            error
          ) {
            console.error(
              "Market WebSocket message error:",
              error
            );
          }
        };

        socket.onerror = () => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          setMarketConnected(
            false
          );
        };

        socket.onclose = () => {
          if (
            wsRef.current ===
            socket
          ) {
            wsRef.current =
              null;
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setMarketConnected(
            false
          );

          scheduleMarketReconnect();
        };
      } catch (error) {
        console.error(
          "Market WebSocket connection failed:",
          error
        );

        if (
          wsRef.current ===
          socket
        ) {
          wsRef.current =
            null;
        }

        setMarketConnected(
          false
        );

        scheduleMarketReconnect();
      }
    }, [
      scheduleMarketReconnect,
    ]);

  const registerEip6963Provider =
    useCallback(
      (event) => {
        const detail =
          event?.detail;

        if (!detail?.provider)
          return;

        const exists =
          eip6963ProvidersRef.current.some(
            (item) =>
              item.provider ===
              detail.provider
          );

        if (!exists) {
          eip6963ProvidersRef.current.push(
            {
              provider:
                detail.provider,
              info:
                detail.info ||
                {},
            }
          );
        }
      },
      []
    );

  useEffect(() => {
    mountedRef.current =
      true;

    loadDashboard();
    loadOrders();
    connectMarketWebSocket();

    window.addEventListener(
      "eip6963:announceProvider",
      registerEip6963Provider
    );

    window.dispatchEvent(
      new Event(
        "eip6963:requestProvider"
      )
    );

    return () => {
      mountedRef.current =
        false;

      window.removeEventListener(
        "eip6963:announceProvider",
        registerEip6963Provider
      );

      disconnectMarketSocket();
    };
  }, [
    loadDashboard,
    loadOrders,
    connectMarketWebSocket,
    disconnectMarketSocket,
    registerEip6963Provider,
  ]);

  useEffect(() => {
    loadMarketMicrostructure();

    const timer = setInterval(
      () => {
        loadMarketMicrostructure();
      },
      30000
    );

    return () =>
      clearInterval(timer);
  }, [
    loadMarketMicrostructure,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadChartCandles() {
      setChartLoading(true);

      const fallback =
        createCandleBuckets(
          chartHistory[
            selectedPair
          ] || [],
          selectedTimeframe
        );

      try {
        const fetched =
          await fetchInternalCandles(
            selectedPair,
            selectedTimeframe
          );

        if (cancelled)
          return;

        if (
          fetched.length >= 2
        ) {
          setChartCandles(
            fetched
          );

          setChartSource(
            "Hyper Trade Internal"
          );
        } else {
          setChartCandles(
            fallback
          );

          setChartSource(
            "Live fallback"
          );
        }
      } catch (
        error
      ) {
        if (cancelled)
          return;

        console.warn(
          "⚠️ Historical chart data unavailable:",
          error?.message ||
            error
        );

        setChartCandles(
          fallback
        );

        setChartSource(
          fallback.length >=
            2
            ? "Live fallback"
            : "Waiting for data"
        );
      } finally {
        if (
          !cancelled
        ) {
          setChartLoading(
            false
          );
        }
      }
    }

    loadChartCandles();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPair,
    selectedTimeframe,
  ]);

  useEffect(() => {
    const price =
      Number(
        market?.[
          selectedPair
        ]?.price
      );

    if (
      !Number.isFinite(
        price
      ) ||
      price <= 0
    ) {
      return;
    }

    setChartCandles(
      (previous) => {
        const next =
          mergeLivePriceIntoCandle(
            previous,
            price,
            selectedTimeframe
          );

        return next;
      }
    );
  }, [
    market,
    selectedPair,
    selectedTimeframe,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadServerSignal() {
      if (!signalEnabled) {
        return;
      }

      const token = localStorage.getItem("hypertrade_token");

      if (!token) {
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/signals/${encodeURIComponent(selectedPair)}?timeframe=${encodeURIComponent(selectedTimeframe)}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          localStorage.removeItem("hypertrade_token");
          localStorage.removeItem("hypertrade_user");
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to load Hyper Trade signal."
          );
        }

        const serverSignal = data?.data;

        if (cancelled || !serverSignal) {
          return;
        }

        setPreviousSignals((previousState) => {
          const previous = previousState[selectedPair];
          const nextState = {
            ...previousState,
            [selectedPair]: serverSignal.signal,
          };

          if (
            previous &&
            previous !== serverSignal.signal &&
            serverSignal.signal !== "WAIT"
          ) {
            setSignalAlert({
              symbol: selectedPair,
              signal: serverSignal.signal,
              confidence: safeNumber(serverSignal.confidence, 0),
              reason: Array.isArray(serverSignal.reasons)
                ? serverSignal.reasons.join(" • ")
                : serverSignal.reasons ||
                  "Hyper Trade internal signal updated.",
            });
          }

          return nextState;
        });

        setSignalDataOverride(serverSignal);
      } catch (error) {
        if (!cancelled) {
          console.warn(
            "⚠️ Hyper Trade internal signal unavailable:",
            error?.message || error
          );
        }
      }
    }

    loadServerSignal();

    const interval = setInterval(
      loadServerSignal,
      5000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    navigate,
    selectedPair,
    selectedTimeframe,
    signalEnabled,
  ]);

  const getProviderForWallet =
    useCallback(
      (walletId) => {
        const definition =
          WALLET_DEFINITIONS.find(
            (item) =>
              item.id ===
              walletId
          );

        if (!definition)
          return null;

        const announced =
          eip6963ProvidersRef.current.find(
            (item) =>
              definition.matcher(
                item.provider,
                item.info
              )
          );

        if (
          announced?.provider
        ) {
          return announced.provider;
        }

        const candidates = [];

        if (
          window.ethereum
        ) {
          if (
            Array.isArray(
              window.ethereum
                .providers
            )
          ) {
            candidates.push(
              ...window.ethereum.providers
            );
          } else {
            candidates.push(
              window.ethereum
            );
          }
        }

        const external =
          walletProviderRefs.current[
            walletId
          ];

        if (external) {
          candidates.push(
            external
          );
        }

        const unique =
          Array.from(
            new Set(
              candidates.filter(
                Boolean
              )
            )
          );

        return (
          unique.find(
            (provider) =>
              definition.matcher(
                provider,
                {}
              )
          ) || null
        );
      },
      []
    );

  const readExternalWallet =
    useCallback(
      async (
        walletId,
        provider,
        address
      ) => {
        if (
          !provider ||
          !address
        ) {
          return;
        }

        try {
          const chainHex =
            await provider.request(
              {
                method:
                  "eth_chainId",
              }
            );

          const chainId =
            parseInt(
              chainHex,
              16
            );

          const network =
            NETWORKS[
              chainId
            ] ||
            `Chain ${chainId}`;

          const balanceHex =
            await provider.request(
              {
                method:
                  "eth_getBalance",
                params: [
                  address,
                  "latest",
                ],
              }
            );

          const ethBalance =
            parseBalance(
              balanceHex,
              18
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setExternalWallets(
            (previous) => ({
              ...previous,
              [walletId]: {
                connected:
                  true,
                address,
                balance:
                  ethBalance,
                network,
              },
            })
          );
        } catch (
          error
        ) {
          console.error(
            `Failed to read ${walletId} balance:`,
            error
          );

          if (
            mountedRef.current
          ) {
            setExternalWallets(
              (previous) => ({
                ...previous,
                [walletId]: {
                  connected:
                    true,
                  address,
                  balance:
                    null,
                  network:
                    "",
                },
              })
            );
          }
        }
      },
      []
    );

  const connectExternalWallet =
    useCallback(
      async (
        walletId
      ) => {
        const definition =
          WALLET_DEFINITIONS.find(
            (item) =>
              item.id ===
              walletId
          );

        if (!definition)
          return;

        setWalletError("");
        setWalletLoading(
          true
        );

        try {
          let provider =
            getProviderForWallet(
              walletId
            );

          if (!provider) {
            window.dispatchEvent(
              new Event(
                "eip6963:requestProvider"
              )
            );

            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  250
                )
            );

            provider =
              getProviderForWallet(
                walletId
              );
          }

          if (
            !provider ||
            typeof provider.request !==
              "function"
          ) {
            throw new Error(
              `${definition.name} was not detected. Install/unlock ${definition.name} before choosing it.`
            );
          }

          const accounts =
            await provider.request(
              {
                method:
                  "eth_requestAccounts",
              }
            );

          if (
            !accounts?.length
          ) {
            throw new Error(
              `${definition.name} did not return an account.`
            );
          }

          const address =
            accounts[0];

          walletProviderRefs.current[
            walletId
          ] = provider;

          setActiveWallet(
            walletId
          );

          setWalletType(
            definition.name
          );

          setWalletAddress(
            address
          );

          localStorage.setItem(
            "hypertrade_wallet_address",
            address
          );

          await readExternalWallet(
            walletId,
            provider,
            address
          );

          if (
            mountedRef.current
          ) {
            showNotification(
              "success",
              `${definition.name} connected successfully.`
            );
          }
        } catch (
          error
        ) {
          console.error(
            `${definition.name} connection error:`,
            error
          );

          if (
            mountedRef.current
          ) {
            setWalletError(
              error.message ||
                `Unable to connect ${definition.name}.`
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setWalletLoading(
              false
            );
          }
        }
      },
      [
        getProviderForWallet,
        readExternalWallet,
        showNotification,
      ]
    );

  const disconnectWallet =
    useCallback(
      (walletId = null) => {
        if (walletId) {
          const provider =
            walletProviderRefs.current[
              walletId
            ];

          try {
            if (
              provider?.removeAllListeners
            ) {
              provider.removeAllListeners(
                "accountsChanged"
              );

              provider.removeAllListeners(
                "chainChanged"
              );
            }
          } catch {}

          delete walletProviderRefs.current[
            walletId
          ];

          setExternalWallets(
            (previous) => ({
              ...previous,
              [walletId]: {
                connected:
                  false,
                address:
                  "",
                balance:
                  null,
                network:
                  "",
              },
            })
          );

          if (
            activeWallet ===
            walletId
          ) {
            setActiveWallet("");
            setWalletAddress(
              ""
            );
            setWalletType("");
            localStorage.removeItem(
              "hypertrade_wallet_address"
            );
          }

          return;
        }

        Object.keys(
          walletProviderRefs.current
        ).forEach(
          (id) => {
            try {
              walletProviderRefs.current[
                id
              ]?.removeAllListeners?.(
                "accountsChanged"
              );

              walletProviderRefs.current[
                id
              ]?.removeAllListeners?.(
                "chainChanged"
              );
            } catch {}
          }
        );

        walletProviderRefs.current =
          {};

        setExternalWallets({
          metamask: {
            connected:
              false,
            address:
              "",
            balance:
              null,
            network:
              "",
          },
          coinomi: {
            connected:
              false,
            address:
              "",
            balance:
              null,
            network:
              "",
          },
          trustwallet: {
            connected:
              false,
            address:
              "",
            balance:
              null,
            network:
              "",
          },
        });

        setActiveWallet("");
        setWalletAddress("");
        setWalletType("");
        setEthBalance(null);
        setUsdtBalance(null);

        localStorage.removeItem(
          "hypertrade_wallet_address"
        );
      },
      [activeWallet]
    );

  useEffect(() => {
    const listeners = [];

    Object.keys(
      walletProviderRefs.current
    );

    const onAccountChange =
      async (
        walletId,
        accounts
      ) => {
        if (
          !accounts?.length
        ) {
          disconnectWallet(
            walletId
          );
          return;
        }

        const provider =
          walletProviderRefs.current[
            walletId
          ];

        if (!provider)
          return;

        const address =
          accounts[0];

        await readExternalWallet(
          walletId,
          provider,
          address
        );
      };

    eip6963ProvidersRef.current.forEach(
      ({ provider }) => {
        if (
          typeof provider?.on !==
          "function"
        ) {
          return;
        }

        for (
          const definition of
            WALLET_DEFINITIONS
        ) {
          if (
            definition.matcher(
              provider,
              {}
            )
          ) {
            const handler =
              (accounts) =>
                onAccountChange(
                  definition.id,
                  accounts
                );

            try {
              provider.on(
                "accountsChanged",
                handler
              );

              listeners.push({
                provider,
                handler,
              });
            } catch {}
          }
        }
      }
    );

    return () => {
      listeners.forEach(
        ({
          provider,
          handler,
        }) => {
          try {
            provider.removeListener(
              "accountsChanged",
              handler
            );
          } catch {}
        }
      );
    };
  }, [
    disconnectWallet,
    readExternalWallet,
  ]);

  const currentHistory =
    useMemo(() => {
      const history =
        chartHistory[
          selectedPair
        ];

      return Array.isArray(
        history
      )
        ? history
        : [];
    }, [
      chartHistory,
      selectedPair,
    ]);

  const currentPrices =
    useMemo(
      () =>
        chartCandles
          .map((item) =>
            Number(
              item.close
            )
          )
          .filter(
            (value) =>
              Number.isFinite(
                value
              ) &&
              value > 0
          ),
      [chartCandles]
    );

  const currentPrice =
    safeNumber(
      market?.[
        selectedPair
      ]?.price,
      0
    );

  const activePrices =
    currentPrices.length
      ? currentPrices
      : currentPrice > 0
      ? [currentPrice]
      : [];

  const fallbackSignalData = useMemo(
    () => calculateSignal(activePrices),
    [activePrices]
  );

  const signalData =
    signalDataOverride &&
    signalDataOverride.symbol === selectedPair &&
    signalDataOverride.timeframe === selectedTimeframe
      ? {
          signal: signalDataOverride.signal || "WAIT",
          confidence: safeNumber(signalDataOverride.confidence, 0),
          score: safeNumber(signalDataOverride.score, 0),
          rsi: safeNumber(signalDataOverride.indicators?.rsi14, 50),
          macd: safeNumber(signalDataOverride.indicators?.macd, 0),
          macdSignal: safeNumber(signalDataOverride.indicators?.macdSignal, 0),
          histogram: safeNumber(signalDataOverride.indicators?.macdHistogram, 0),
          ema9: signalDataOverride.indicators?.ema9 ?? null,
          ema21: signalDataOverride.indicators?.ema21 ?? null,
          sma20: signalDataOverride.indicators?.sma20 ?? null,
          trend: safeNumber(signalDataOverride.indicators?.trendPercent, 0),
          volatility: safeNumber(signalDataOverride.indicators?.volatilityPercent, 0),
          support: signalDataOverride.indicators?.support ?? null,
          resistance: signalDataOverride.indicators?.resistance ?? null,
          reason: Array.isArray(signalDataOverride.reasons)
            ? signalDataOverride.reasons.join(" • ")
            : signalDataOverride.reason || "No strong directional signal.",
        }
      : fallbackSignalData;

  const candles =
    chartCandles;

  const candleHigh =
    candles.length
      ? Math.max(
          ...candles.map(
            (candle) =>
              Number(
                candle.high
              )
          )
        )
      : 0;

  const candleLow =
    candles.length
      ? Math.min(
          ...candles.map(
            (candle) =>
              Number(
                candle.low
              )
          )
        )
      : 0;

  const chartMin =
    candleLow ||
    (activePrices.length
      ? Math.min(
          ...activePrices
        )
      : 0);

  const chartMax =
    candleHigh ||
    (activePrices.length
      ? Math.max(
          ...activePrices
        )
      : 0);

  const chartRange =
    chartMax - chartMin ||
    Math.max(
      chartMax * 0.002,
      1
    );

  const chartChange =
    activePrices.length >= 2 &&
    activePrices[0] > 0
      ? ((activePrices.at(-1) -
          activePrices[0]) /
          activePrices[0]) *
        100
      : 0;

  const linePoints =
    candlePricePath(
      candles,
      "close",
      chartMin,
      chartRange
    ) ||
    svgPathFromPrices(
      activePrices,
      chartMin,
      chartRange
    );

  const ema9Points =
    candlePricePath(
      candles.map(
        (
          candle,
          index,
          list
        ) => ({
          ...candle,
          ema: calculateEMA(
            list
              .slice(
                0,
                index + 1
              )
              .map((item) =>
                Number(
                  item.close
                )
              ),
            9
          ),
        })
      ),
      "ema",
      chartMin,
      chartRange
    );

  const ema21Points =
    candlePricePath(
      candles.map(
        (
          candle,
          index,
          list
        ) => ({
          ...candle,
          ema: calculateEMA(
            list
              .slice(
                0,
                index + 1
              )
              .map((item) =>
                Number(
                  item.close
                )
              ),
            21
          ),
        })
      ),
      "ema",
      chartMin,
      chartRange
    );

  const selectedPairInfo =
    TRADE_PAIRS.find(
      (pair) =>
        pair.symbol ===
        selectedPair
    ) ||
    TRADE_PAIRS[0];

  const orderExecutionPrice =
    orderType ===
      "limit" &&
    Number(limitPrice) > 0
      ? Number(limitPrice)
      : currentPrice;

  const orderNumericAmount =
    Number(orderAmount);

  const estimatedTotal =
    Number.isFinite(
      orderExecutionPrice
    ) &&
    Number.isFinite(
      orderNumericAmount
    ) &&
    orderExecutionPrice > 0 &&
    orderNumericAmount > 0
      ? orderNumericAmount *
        orderExecutionPrice
      : 0;

  const tradingFee =
    estimatedTotal *
    TRADING_FEE_RATE;

  const finalTotal =
    orderSide === "buy"
      ? estimatedTotal +
        tradingFee
      : Math.max(
          0,
          estimatedTotal -
            tradingFee
        );

  const submitOrder =
    async () => {
      if (
        !orderNumericAmount ||
        !Number.isFinite(
          orderNumericAmount
        ) ||
        orderNumericAmount <= 0
      ) {
        showNotification(
          "error",
          "Enter a valid order amount."
        );

        return;
      }

      if (
        selectedPairInfo.requiresIrt
      ) {
        showNotification(
          "error",
          "USDT/IRT UI is enabled, but the current backend order engine must support USDT/IRT before execution."
        );

        return;
      }

      if (
        orderType ===
          "limit" &&
        (!Number.isFinite(
          Number(limitPrice)
        ) ||
          Number(limitPrice) <= 0)
      ) {
        showNotification(
          "error",
          "Enter a valid limit price."
        );

        return;
      }

      if (
        orderType ===
          "market" &&
        (!currentPrice ||
          !Number.isFinite(
            currentPrice
          ))
      ) {
        showNotification(
          "error",
          "Current market price is unavailable."
        );

        return;
      }

      const token =
        localStorage.getItem(
          "hypertrade_token"
        );

      if (!token) {
        navigate("/");
        return;
      }

      setOrderSubmitting(
        true
      );

      try {
        const response =
          await fetch(
            `${API_URL}/api/orders`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                symbol: `${selectedPair}/USDT`,
                side:
                  orderSide.toUpperCase(),
                type:
                  orderType.toUpperCase(),
                amount:
                  orderNumericAmount,
                price:
                  orderType ===
                  "limit"
                    ? Number(
                        limitPrice
                      )
                    : currentPrice,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "hypertrade_token"
          );

          navigate("/");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Order rejected by backend."
          );
        }

        showNotification(
          "success",
          data?.message ||
            "Order accepted by Hyper Trade."
        );

        setOrderAmount("");
        setLimitPrice("");

        await Promise.all([
          loadDashboard(),
          loadOrders(),
        ]);
      } catch (
        error
      ) {
        console.error(
          "Order submission error:",
          error
        );

        showNotification(
          "error",
          error.message ||
            "Unable to submit order."
        );
      } finally {
        if (
          mountedRef.current
        ) {
          setOrderSubmitting(
            false
          );
        }
      }
    };

  const applySignal =
    () => {
      if (
        signalData.signal ===
        "BUY"
      ) {
        setOrderSide(
          "buy"
        );

        showNotification(
          "info",
          `Buy panel prepared for ${selectedPair}.`
        );
      } else if (
        signalData.signal ===
        "SELL"
      ) {
        setOrderSide(
          "sell"
        );

        showNotification(
          "info",
          `Sell panel prepared for ${selectedPair}.`
        );
      } else {
        showNotification(
          "info",
          "The current signal is HOLD."
        );
      }
    };

  const logout = () => {
    disconnectWallet();

    localStorage.removeItem(
      "hypertrade_token"
    );

    localStorage.removeItem(
      "hypertrade_user"
    );

    navigate("/");
  };

  useEffect(() => {
    if (!notification)
      return;

    const timer =
      setTimeout(() => {
        if (
          mountedRef.current
        ) {
          setNotification(
            null
          );
        }
      }, 5000);

    return () =>
      clearTimeout(
        timer
      );
  }, [notification]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />

          <p className="text-zinc-400">
            Loading Hyper Trade...
          </p>
        </div>
      </div>
    );
  }

  if (pageError && !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-red-400">
            Dashboard Error
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Unable to load Hyper Trade
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {pageError}
          </p>

          <button
            type="button"
            onClick={() => {
              setPageError("");
              setLoading(true);
              loadDashboard();
            }}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const storedUser =
    (() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "hypertrade_user"
          ) || "null"
        );
      } catch {
        return null;
      }
    })();

  const user =
    dashboard?.user ||
    storedUser || {
      fullName: "Trader",
      email: "",
    };

  const userRole =
    String(
      dashboard?.user?.role ||
        storedUser?.role ||
        "USER"
    ).toUpperCase();

  const canAccessAdmin =
    userRole === "ADMIN" ||
    userRole ===
      "SUPER_ADMIN";

  const isSuperAdmin =
    userRole ===
    "SUPER_ADMIN";

  const internalWalletData =
    dashboard?.wallet ||
    internalWallet;

  const openSupport =
    () => {
      navigate(
        "/support"
      );
    };

  const openAdminPanel =
    () => {
      const email =
        String(
          dashboard?.user?.email ||
            storedUser?.email ||
            ""
        ).trim().toLowerCase();

      navigate(
        email === "sadrafayyaz9@gmail.com" ||
          isSuperAdmin
          ? "/super-admin"
          : "/admin"
      );
    };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {notification && (
        <div className="fixed right-5 top-5 z-[70] w-[min(430px,calc(100vw-40px))]">
          <div
            className={`rounded-2xl border p-4 shadow-2xl backdrop-blur ${
              notification.type ===
              "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : notification.type ===
                  "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-6">
                {notification.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setNotification(
                    null
                  )
                }
                className="text-zinc-500 hover:text-white"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {signalAlert && (
        <div className="fixed bottom-5 left-5 z-[65] w-[min(390px,calc(100vw-40px))] rounded-2xl border border-zinc-700 bg-[#0A0F1E] p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Market Signal
              </p>

              <p
                className={`mt-1 text-3xl font-black ${
                  signalAlert.signal ===
                  "BUY"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {signalAlert.signal}
              </p>
            </div>

            <span className="rounded-xl bg-zinc-900 px-3 py-2 text-xs">
              {signalAlert.symbol}/USDT
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">
                Confidence
              </span>

              <span className="font-bold">
                {Math.round(
                  signalAlert.confidence
                )}
                %
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full ${
                  signalAlert.signal ===
                  "BUY"
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
                style={{
                  width: `${signalAlert.confidence}%`,
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-400">
            {signalAlert.reason}
          </p>

          <button
            type="button"
            onClick={() =>
              setSignalAlert(
                null
              )
            }
            className="mt-4 w-full rounded-xl bg-zinc-900 py-2 text-xs text-zinc-400 hover:text-white"
          >
            Close
          </button>
        </div>
      )}

      <header className="border-b border-zinc-800 bg-[#080D1A]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Hyper Trade
            </h1>

            <p className="text-sm text-zinc-500">
              Professional Crypto Trading Terminal
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-zinc-400 lg:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  marketConnected
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />

              {marketConnected
                ? "Market Live"
                : "Market Offline"}
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-500 lg:flex">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Internal Order Book
            </div>

            <button
              type="button"
              onClick={
                openSupport
              }
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white sm:px-4 sm:text-sm"
            >
              Support
            </button>

            <div className="hidden items-center gap-2 text-sm lg:flex">
              <span className="text-zinc-500">
                Do you have any question?
              </span>
              <button
                type="button"
                onClick={openSupport}
                className="font-bold text-blue-400 transition hover:text-blue-300 hover:underline"
              >
                Ask it
              </button>
            </div>

            {canAccessAdmin && (
              <button
                type="button"
                onClick={
                  openAdminPanel
                }
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                  isSuperAdmin
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:border-purple-400 hover:bg-purple-500/20 hover:text-white"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                {isSuperAdmin
                  ? "Super Admin"
                  : "Admin Panel"}
              </button>
            )}

            <button
              type="button"
              onClick={
                logout
              }
              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold transition hover:border-red-500 hover:text-red-400 sm:px-4 sm:text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-zinc-500">
                Welcome back,
              </p>

              <h2 className="mt-1 text-3xl font-black">
                {user.fullName ||
                  "Trader"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {user.email || ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  openSupport
                }
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white sm:text-sm"
              >
                Open Support Center
              </button>

              {canAccessAdmin && (
                <button
                  type="button"
                  onClick={
                    openAdminPanel
                  }
                  className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                    isSuperAdmin
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:border-purple-400 hover:bg-purple-500/20 hover:text-white"
                      : "border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  {isSuperAdmin
                    ? "Open Super Admin Panel"
                    : "Open Admin Panel"}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={
              openSupport
            }
            className="group rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-[#0A0F1E] p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  Customer Care
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Support Center
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  Send a question to Hyper Trade using text, images, or video and continue the conversation with our support team.
                </p>
              </div>

              <span className="rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300 transition group-hover:bg-blue-500/20">
                Open
              </span>
            </div>
          </button>

          {canAccessAdmin ? (
            <button
              type="button"
              onClick={
                openAdminPanel
              }
              className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
                isSuperAdmin
                  ? "border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-[#0A0F1E] hover:border-purple-400/40"
                  : "border-zinc-800 bg-[#0A0F1E] hover:border-zinc-600"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-widest ${
                      isSuperAdmin
                        ? "text-purple-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {isSuperAdmin
                      ? "Platform Management"
                      : "Staff Management"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {isSuperAdmin
                      ? "Super Admin Panel"
                      : "Admin Panel"}
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                    {isSuperAdmin
                      ? "Manage administrators, fee settings, settlements, support operations, and platform controls."
                      : "Review customer support tickets, respond to users, and manage permitted administrative operations."}
                  </p>
                </div>

                <span
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    isSuperAdmin
                      ? "bg-purple-500/10 text-purple-300"
                      : "bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {isSuperAdmin
                    ? "Manage"
                    : "Open"}
                </span>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                Account Access
              </p>

              <h3 className="mt-2 text-xl font-black">
                Trading Account
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Your account can trade, manage wallet activity, and contact Hyper Trade support from this dashboard.
              </p>
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                Live Market
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                BTC · ETH · SOL · USDT · TRX
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ASSETS.map(
              (asset) => {
                const data =
                  market[
                    asset.symbol
                  ];

                return (
                  <button
                    type="button"
                    key={
                      asset.symbol
                    }
                    onClick={() =>
                      setSelectedPair(
                        asset.symbol
                      )
                    }
                    className={`rounded-2xl border bg-[#0A0F1E] p-5 text-left transition hover:-translate-y-0.5 hover:border-zinc-600 ${
                      selectedPair ===
                      asset.symbol
                        ? "border-blue-500/60 ring-1 ring-blue-500/20"
                        : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xl font-black ${asset.accent}`}
                        >
                          {asset.icon}
                        </span>

                        <div>
                          <p className="text-sm font-black">
                            {asset.symbol}
                          </p>

                          <p className="text-xs text-zinc-600">
                            {asset.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold ${
                          safeNumber(
                            data?.change24h,
                            0
                          ) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatChange(
                          data?.change24h
                        )}
                      </span>
                    </div>

                    <p className="mt-5 text-2xl font-black">
                      {formatPrice(
                        data?.price,
                        asset.symbol
                      )}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      USDT
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <ProfessionalMarketChart
            candles={candles}
            selectedPair={selectedPair}
            selectedTimeframe={selectedTimeframe}
            chartType={chartType}
            setChartType={setChartType}
            chartLoading={chartLoading}
            chartSource={chartSource}
            signalData={signalData}
            liveOrderBook={liveOrderBook}
            liveTimeSales={liveTimeSales}
          />

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  AI Market Analysis
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Trading Signal
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSignalDetails(
                    (value) =>
                      !value
                  )
                }
                className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                {showSignalDetails
                  ? "Hide Details"
                  : "Show Details"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#050816] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-600">
                    Current Signal
                  </p>

                  <p
                    className={`mt-2 text-4xl font-black ${
                      signalData.signal ===
                      "BUY"
                        ? "text-emerald-400"
                        : signalData.signal ===
                          "SELL"
                        ? "text-red-400"
                        : signalData.signal ===
                          "WAIT"
                        ? "text-zinc-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {
                      signalData.signal
                    }
                  </p>
                </div>

                <SignalBadge
                  signal={
                    signalData.signal
                  }
                  confidence={
                    signalData.confidence
                  }
                />
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">
                    Confidence
                  </span>

                  <span className="font-bold">
                    {Math.round(
                      signalData.confidence
                    )}
                    %
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full ${
                      signalData.signal ===
                      "BUY"
                        ? "bg-emerald-400"
                        : signalData.signal ===
                          "SELL"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                    }`}
                    style={{
                      width: `${signalData.confidence}%`,
                    }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {signalData.reason}
              </p>

              <button
                type="button"
                onClick={
                  applySignal
                }
                disabled={
                  signalData.signal ===
                  "WAIT"
                }
                className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-black hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply Signal to Trade
              </button>
            </div>

            {showSignalDetails && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    EMA 9
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.ema9 !==
                    null
                      ? formatPrice(
                          signalData.ema9,
                          selectedPair
                        )
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    EMA 21
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.ema21 !==
                    null
                      ? formatPrice(
                          signalData.ema21,
                          selectedPair
                        )
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    SMA 20
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.sma20 !==
                    null
                      ? formatPrice(
                          signalData.sma20,
                          selectedPair
                        )
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    Volatility
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.volatility.toFixed(
                      2
                    )}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    Support
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.support !==
                    null
                      ? formatPrice(
                          signalData.support,
                          selectedPair
                        )
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                  <p className="text-xs text-zinc-600">
                    Resistance
                  </p>

                  <p className="mt-2 font-mono text-sm font-bold">
                    {signalData.resistance !==
                    null
                      ? formatPrice(
                          signalData.resistance,
                          selectedPair
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <div>
                <p className="text-xs text-zinc-600">
                  Signal Alerts
                </p>

                <p className="mt-1 text-sm font-semibold">
                  Notify when the signal changes
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSignalEnabled(
                    (value) =>
                      !value
                  )
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  signalEnabled
                    ? "bg-blue-600"
                    : "bg-zinc-800"
                }`}
                aria-label="Toggle signal alerts"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    signalEnabled
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                External Wallets
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                Connect a Wallet
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
                Connect your supported browser wallet to inspect the address, network, and native balance.
              </p>
            </div>

            {activeWallet && (
              <button
                type="button"
                onClick={() =>
                  disconnectWallet()
                }
                className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10"
              >
                Disconnect Wallet
              </button>
            )}
          </div>

          {walletError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              {walletError}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {WALLET_DEFINITIONS.map(
              (wallet) => {
                const state =
                  externalWallets[
                    wallet.id
                  ];

                return (
                  <div
                    key={
                      wallet.id
                    }
                    className={`rounded-2xl border p-5 ${
                      state.connected
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-zinc-800 bg-[#050816]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <ExternalWalletLogo
                        id={
                          wallet.id
                        }
                      />

                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          state.connected
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-900 text-zinc-600"
                        }`}
                      >
                        {state.connected
                          ? "Connected"
                          : "Not Connected"}
                      </span>
                    </div>

                    <h4 className="mt-5 text-lg font-black">
                      {wallet.name}
                    </h4>

                    <p className="mt-1 text-xs text-zinc-600">
                      {
                        wallet.subtitle
                      }
                    </p>

                    {state.connected && (
                      <>
                        <div className="mt-5 rounded-xl bg-[#0A0F1E] p-4">
                          <p className="text-xs text-zinc-600">
                            Address
                          </p>

                          <p className="mt-2 break-all font-mono text-xs text-zinc-300">
                            {state.address ||
                              "—"}
                          </p>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                          <div className="rounded-xl bg-[#0A0F1E] p-4">
                            <p className="text-xs text-zinc-600">
                              Network
                            </p>

                            <p className="mt-2 text-sm font-bold">
                              {state.network ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#0A0F1E] p-4">
                            <p className="text-xs text-zinc-600">
                              Native Balance
                            </p>

                            <p className="mt-2 font-mono text-sm font-bold">
                              {state.balance ??
                                "—"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            disconnectWallet(
                              wallet.id
                            )
                          }
                          className="mt-4 w-full rounded-xl border border-zinc-700 py-3 text-xs font-bold text-zinc-400 hover:text-white"
                        >
                          Disconnect
                        </button>
                      </>
                    )}

                    {!state.connected && (
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() =>
                            connectExternalWallet(
                              wallet.id
                            )
                          }
                          disabled={
                            walletLoading
                          }
                          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
                        >
                          {walletLoading
                            ? "Connecting..."
                            : `Connect ${wallet.name}`}
                        </button>

                        <a
                          href={
                            wallet.installUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 block text-center text-xs text-zinc-600 hover:text-zinc-300"
                        >
                          Get {wallet.name}
                        </a>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <p className="text-xs text-zinc-600">
                Active Wallet
              </p>

              <p className="mt-2 text-sm font-black">
                {walletType ||
                  "None"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <p className="text-xs text-zinc-600">
                Active Address
              </p>

              <p className="mt-2 break-all font-mono text-xs font-bold">
                {walletAddress ||
                  "None"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <p className="text-xs text-zinc-600">
                Network
              </p>

              <p className="mt-2 text-sm font-black">
                {networkName ||
                  "—"}
              </p>
            </div>
          </div>

          {(ethBalance ||
            usdtBalance) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                <p className="text-xs text-zinc-600">
                  ETH Balance
                </p>

                <p className="mt-2 font-mono text-sm font-black">
                  {ethBalance ??
                    "—"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                <p className="text-xs text-zinc-600">
                  USDT Balance
                </p>

                <p className="mt-2 font-mono text-sm font-black">
                  {usdtBalance ??
                    "—"}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="mb-5">
            <p className="text-sm text-zinc-500">
              Trading
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Place Order
            </h3>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="mb-2 text-xs text-zinc-600">
                Pair
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {TRADE_PAIRS.map(
                  (pair) => (
                    <button
                      key={
                        pair.symbol
                      }
                      type="button"
                      onClick={() =>
                        setSelectedPair(
                          pair.symbol
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-bold text-left ${
                        selectedPair ===
                        pair.symbol
                          ? "border-blue-500 bg-blue-500/10 text-blue-400"
                          : "border-zinc-800 bg-[#050816] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {
                        pair.label
                      }
                    </button>
                  )
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs text-zinc-600">
                  Side
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOrderSide(
                        "buy"
                      )
                    }
                    className={`rounded-xl border py-3 text-sm font-semibold ${
                      orderSide ===
                      "buy"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-800 text-zinc-500"
                    }`}
                  >
                    Buy
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOrderSide(
                        "sell"
                      )
                    }
                    className={`rounded-xl border py-3 text-sm font-semibold ${
                      orderSide ===
                      "sell"
                        ? "border-red-500 bg-red-500/10 text-red-400"
                        : "border-zinc-800 text-zinc-500"
                    }`}
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-zinc-600">
                Order Type
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOrderType(
                      "market"
                    )
                  }
                  className={`rounded-xl border py-3 text-sm font-semibold ${
                    orderType ===
                    "market"
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-zinc-800 text-zinc-500"
                  }`}
                >
                  Market
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOrderType(
                      "limit"
                    )
                  }
                  className={`rounded-xl border py-3 text-sm font-semibold ${
                    orderType ===
                    "limit"
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-zinc-800 text-zinc-500"
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs text-zinc-600">
              Price
            </p>

            {orderType ===
            "limit" ? (
              <input
                type="number"
                min="0"
                step="any"
                value={
                  limitPrice
                }
                onChange={(event) =>
                  setLimitPrice(
                    event.target
                      .value
                  )
                }
                placeholder="Enter limit price"
                className="w-full rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3 font-mono text-sm outline-none placeholder:text-zinc-700 focus:border-blue-500"
              />
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3 font-mono text-sm">
                {currentPrice > 0
                  ? formatPrice(
                      currentPrice,
                      selectedPair
                    )
                  : "Market unavailable"}{" "}
                <span className="text-zinc-700">
                  {
                    selectedPairInfo.quote
                  }
                </span>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs text-zinc-600">
              Amount
            </p>

            <input
              type="number"
              min="0"
              step="any"
              value={
                orderAmount
              }
              onChange={(event) =>
                setOrderAmount(
                  event.target
                    .value
                )
              }
              placeholder={`0.00 ${selectedPair}`}
              className="w-full rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3 text-sm outline-none placeholder:text-zinc-700 focus:border-blue-500"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[#050816] p-4">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">
                Est. Total
              </span>

              <span className="font-semibold">
                {estimatedTotal.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 6,
                  }
                )}{" "}
                {
                  selectedPairInfo.quote
                }
              </span>
            </div>

            <div className="mt-2 flex justify-between text-xs">
              <span className="text-zinc-600">
                Trading Fee
              </span>

              <span className="font-semibold text-zinc-400">
                {tradingFee.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 6,
                  }
                )}{" "}
                {
                  selectedPairInfo.quote
                }
              </span>
            </div>

            <div className="mt-3 border-t border-zinc-800 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">
                  Final Estimate
                </span>

                <span className="font-bold">
                  {finalTotal.toLocaleString(
                    "en-US",
                    {
                      maximumFractionDigits: 6,
                    }
                  )}{" "}
                  {
                    selectedPairInfo.quote
                  }
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              submitOrder
            }
            disabled={
              orderSubmitting
            }
            className={`mt-5 w-full rounded-xl py-4 text-sm font-black transition disabled:opacity-50 ${
              orderSide ===
              "buy"
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {orderSubmitting
              ? "Submitting..."
              : orderSide ===
                "buy"
              ? `Buy ${selectedPair}`
              : `Sell ${selectedPair}`}
          </button>

          <p className="mt-3 text-center text-[11px] leading-5 text-zinc-700">
            Final execution, balance checks and fee accounting are enforced by the Backend Order Engine.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Internal Wallet
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                Portfolio Balances
              </h3>
            </div>

            <span className="text-xs text-zinc-600">
              Hyper Trade account ledger
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              [
                "IRT",
                internalWalletData.rialBalance,
              ],
              [
                "BTC",
                internalWalletData.btcBalance,
              ],
              [
                "ETH",
                internalWalletData.ethBalance,
              ],
              [
                "SOL",
                internalWalletData.solBalance,
              ],
              [
                "TRX",
                internalWalletData.trxBalance ||
                  "0",
              ],
              [
                "USDT",
                internalWalletData.usdtBalance,
              ],
            ].map(
              ([
                symbol,
                balance,
              ]) => (
                <div
                  key={
                    symbol
                  }
                  className="rounded-xl border border-zinc-800 bg-[#050816] p-4"
                >
                  <p className="text-xs text-zinc-600">
                    {symbol}
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {balance ??
                      "0"}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Order History
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                Recent Orders
              </h3>
            </div>

            <button
              type="button"
              onClick={
                loadOrders
              }
              className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
            >
              Refresh
            </button>
          </div>

          {orderHistory.length ===
          0 ? (
            <div className="mt-5 rounded-xl bg-[#050816] p-6 text-center text-sm text-zinc-600">
              No orders recorded yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-600">
                    <th className="px-4 py-3">
                      Symbol
                    </th>

                    <th className="px-4 py-3">
                      Side
                    </th>

                    <th className="px-4 py-3">
                      Amount
                    </th>

                    <th className="px-4 py-3">
                      Price
                    </th>

                    <th className="px-4 py-3">
                      Fee
                    </th>

                    <th className="px-4 py-3">
                      Total
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orderHistory
                    .slice(
                      0,
                      50
                    )
                    .map(
                      (
                        order
                      ) => (
                        <tr
                          key={
                            order.id ||
                            `${order.symbol}-${order.createdAt}`
                          }
                          className="border-b border-zinc-900"
                        >
                          <td className="px-4 py-4 font-bold">
                            {order.symbol ||
                              "—"}
                          </td>

                          <td
                            className={`px-4 py-4 font-bold ${
                              String(
                                order.side
                              ).toUpperCase() ===
                              "BUY"
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {order.side ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 font-mono text-xs">
                            {order.amount ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 font-mono text-xs">
                            {order.price ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 font-mono text-xs">
                            {order.fee ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 font-mono text-xs">
                            {order.total ||
                              "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-lg bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400">
                              {order.status ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-xs text-zinc-600">
                            {formatDate(
                              order.createdAt
                            )}
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs text-zinc-600">
              Selected Market
            </p>

            <p className="mt-2 text-xl font-black">
              {selectedPair}/USDT
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs text-zinc-600">
              Market Status
            </p>

            <p
              className={`mt-2 text-xl font-black ${
                marketConnected
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {marketConnected
                ? "LIVE"
                : "OFFLINE"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs text-zinc-600">
              Trading Fee
            </p>

            <p className="mt-2 text-xl font-black">
              0.5%
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs text-zinc-600">
              Current Signal
            </p>

            <p
              className={`mt-2 text-xl font-black ${
                signalData.signal ===
                "BUY"
                  ? "text-emerald-400"
                  : signalData.signal ===
                    "SELL"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {signalData.signal}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}