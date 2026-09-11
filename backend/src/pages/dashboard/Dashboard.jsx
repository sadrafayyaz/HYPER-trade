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
    subtitle: "Independent wallet provider",
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

    const bucketTime = Math.floor(time / bucketMs) * bucketMs;

    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } else {
      const candle = buckets.get(bucketTime);

      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .slice(-60);
}

function svgPathFromPrices(values, min, range) {
  if (values.length < 2) {
    return "0,50 100,50";
  }

  return values
    .map((price, index) => {
      const x =
        values.length === 1
          ? 50
          : (index / (values.length - 1)) * 100;

      const y = clamp(
        100 - ((price - min) / range) * 100,
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

function SignalBadge({ signal, confidence }) {
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
      <span className={`font-bold ${config.text}`}>
        {signal}
      </span>
      {typeof confidence === "number" && (
        <span className="text-xs text-zinc-400">
          {Math.round(confidence)}%
        </span>
      )}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const mountedRef = useRef(false);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const walletProviderRefs = useRef({});
  const eip6963ProvidersRef = useRef([]);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [market, setMarket] = useState(DEFAULT_MARKET);
  const [marketConnected, setMarketConnected] = useState(false);
  const [chartHistory, setChartHistory] = useState({});

  const [selectedPair, setSelectedPair] = useState("BTC");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState("1H");
  const [chartType, setChartType] = useState("candle");

  const [orderSide, setOrderSide] = useState("buy");
  const [orderType, setOrderType] = useState("market");
  const [orderAmount, setOrderAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [orderSubmitting, setOrderSubmitting] =
    useState(false);

  const [orderHistory, setOrderHistory] = useState([]);

  const [signalEnabled, setSignalEnabled] =
    useState(true);
  const [previousSignals, setPreviousSignals] =
    useState({});
  const [signalAlert, setSignalAlert] = useState(null);
  const [showSignalDetails, setShowSignalDetails] =
    useState(true);

  const [walletLoading, setWalletLoading] =
    useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletType, setWalletType] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState("");
  const [ethBalance, setEthBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);

  const [externalWallets, setExternalWallets] =
    useState({
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

  const [internalWallet, setInternalWallet] =
    useState({
      rialBalance: "0",
      btcBalance: "0",
      ethBalance: "0",
      solBalance: "0",
      trxBalance: "0",
      usdtBalance: "0",
    });

  const [notification, setNotification] =
    useState(null);

  const showNotification = useCallback(
    (type, message) => {
      if (!mountedRef.current) return;
      setNotification({ type, message });
    },
    []
  );

  const loadOrders = useCallback(async () => {
    const token =
      localStorage.getItem("hypertrade_token");

    if (!token) return;

    try {
      const response = await fetch(
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
        await response.json().catch(() => ({}));

      const list = Array.isArray(data?.data)
        ? data.data
        : [];

      if (mountedRef.current) {
        setOrderHistory(list);
      }
    } catch (error) {
      console.error("Order history error:", error);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    const token =
      localStorage.getItem("hypertrade_token");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("hypertrade_token");
        localStorage.removeItem("hypertrade_user");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load dashboard."
        );
      }

      if (!mountedRef.current) return;

      setDashboard(data?.data || null);

      const wallet = data?.data?.wallet;

      if (wallet && typeof wallet === "object") {
        setInternalWallet((previous) => ({
          ...previous,
          ...wallet,
        }));
      }
    } catch (error) {
      console.error("Dashboard error:", error);

      if (mountedRef.current) {
        setPageError(
          error.message ||
            "Unable to load dashboard."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [navigate]);

  const disconnectMarketSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptRef.current = 0;

    const socket = wsRef.current;
    wsRef.current = null;

    if (!socket) return;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    try {
      if (
        socket.readyState === WebSocket.OPEN ||
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
      if (!mountedRef.current) return;

      if (reconnectTimerRef.current) {
        return;
      }

      const attempt =
        reconnectAttemptRef.current;

      const delay = Math.min(
        3000 * Math.pow(1.5, attempt),
        30000
      );

      reconnectAttemptRef.current =
        attempt + 1;

      reconnectTimerRef.current =
        setTimeout(() => {
          reconnectTimerRef.current = null;

          if (
            mountedRef.current
          ) {
            connectMarketWebSocket();
          }
        }, delay);
    }, []);

  const connectMarketWebSocket =
    useCallback(() => {
      if (!mountedRef.current) return;

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

      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current
        );
        reconnectTimerRef.current = null;
      }

      let socket;

      try {
        socket =
          new WebSocket(
            MARKET_WS_URL
          );

        wsRef.current = socket;

        socket.onopen = () => {
          if (
            !mountedRef.current
          ) {
            try {
              socket.close();
            } catch {}
            return;
          }

          reconnectAttemptRef.current = 0;
          setMarketConnected(true);
          console.log(
            "📡 Hyper Trade Market WebSocket connected"
          );
        };

        socket.onmessage = (event) => {
          if (!mountedRef.current) return;

          try {
            const message =
              JSON.parse(event.data);

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

            setMarket((previous) => {
              const next = {
                ...previous,
              };

              for (const symbol of Object.keys(
                DEFAULT_MARKET
              )) {
                if (incoming[symbol]) {
                  next[symbol] = {
                    ...previous[symbol],
                    ...incoming[symbol],
                  };
                }
              }

              return next;
            });

            for (const symbol of Object.keys(
              DEFAULT_MARKET
            )) {
              const price =
                Number(
                  incoming?.[symbol]?.price
                );

              if (
                !Number.isFinite(price) ||
                price <= 0
              ) {
                continue;
              }

              setChartHistory(
                (previous) => {
                  const old = Array.isArray(
                    previous[symbol]
                  )
                    ? previous[symbol]
                    : [];

                  const last =
                    old.at(-1);

                  if (
                    last &&
                    Number(last.price) === price
                  ) {
                    return previous;
                  }

                  return {
                    ...previous,
                    [symbol]: [
                      ...old,
                      {
                        time: Date.now(),
                        price,
                      },
                    ].slice(-600),
                  };
                }
              );
            }
          } catch (error) {
            console.error(
              "Market WebSocket message error:",
              error
            );
          }
        };

        socket.onerror = () => {
          if (!mountedRef.current) return;
          setMarketConnected(false);
        };

        socket.onclose = () => {
          if (
            wsRef.current === socket
          ) {
            wsRef.current = null;
          }

          if (!mountedRef.current) {
            return;
          }

          setMarketConnected(false);
          scheduleMarketReconnect();
        };
      } catch (error) {
        console.error(
          "Market WebSocket connection failed:",
          error
        );

        if (
          wsRef.current === socket
        ) {
          wsRef.current = null;
        }

        setMarketConnected(false);
        scheduleMarketReconnect();
      }
    }, [scheduleMarketReconnect]);

  const registerEip6963Provider =
    useCallback((event) => {
      const detail = event?.detail;

      if (!detail?.provider) return;

      const exists =
        eip6963ProvidersRef.current.some(
          (item) =>
            item.provider === detail.provider
        );

      if (!exists) {
        eip6963ProvidersRef.current.push({
          provider: detail.provider,
          info: detail.info || {},
        });
      }
    }, []);

  useEffect(() => {
    mountedRef.current = true;

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
      mountedRef.current = false;

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
    if (!signalEnabled) return;

    const currentSignal =
      calculateSignal(
        (chartHistory[selectedPair] || []).map(
          (item) => Number(item.price)
        )
      );

    if (
      currentSignal.signal ===
      "WAIT"
    ) {
      return;
    }

    const previous =
      previousSignals[selectedPair];

    if (
      previous ===
      currentSignal.signal
    ) {
      return;
    }

    setPreviousSignals((previousState) => ({
      ...previousState,
      [selectedPair]:
        currentSignal.signal,
    }));

    setSignalAlert({
      symbol: selectedPair,
      signal: currentSignal.signal,
      confidence:
        currentSignal.confidence,
      reason:
        currentSignal.reason,
    });

    const timer =
      setTimeout(() => {
        if (mountedRef.current) {
          setSignalAlert(null);
        }
      }, 7000);

    return () => clearTimeout(timer);
  }, [
    chartHistory,
    selectedPair,
    signalEnabled,
    previousSignals,
  ]);

  const getProviderForWallet =
    useCallback((walletId) => {
      const definition =
        WALLET_DEFINITIONS.find(
          (item) =>
            item.id === walletId
        );

      if (!definition) return null;

      const announced =
        eip6963ProvidersRef.current.find(
          (item) =>
            definition.matcher(
              item.provider,
              item.info
            )
        );

      if (announced?.provider) {
        return announced.provider;
      }

      const candidates = [];

      if (window.ethereum) {
        if (
          Array.isArray(
            window.ethereum.providers
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
        candidates.push(external);
      }

      const unique = Array.from(
        new Set(
          candidates.filter(Boolean)
        )
      );

      return (
        unique.find((provider) =>
          definition.matcher(
            provider,
            {}
          )
        ) || null
      );
    }, []);

  const readExternalWallet =
    useCallback(
      async (walletId, provider, address) => {
        if (!provider || !address) {
          return;
        }

        try {
          const chainHex =
            await provider.request({
              method: "eth_chainId",
            });

          const chainId =
            parseInt(chainHex, 16);

          const network =
            NETWORKS[chainId] ||
            `Chain ${chainId}`;

          const balanceHex =
            await provider.request({
              method:
                "eth_getBalance",
              params: [
                address,
                "latest",
              ],
            });

          const ethBalance =
            parseBalance(
              balanceHex,
              18
            );

          if (!mountedRef.current) return;

          setExternalWallets(
            (previous) => ({
              ...previous,
              [walletId]: {
                connected: true,
                address,
                balance:
                  ethBalance,
                network,
              },
            })
          );
        } catch (error) {
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
                  connected: true,
                  address,
                  balance: null,
                  network: "",
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
      async (walletId) => {
        const definition =
          WALLET_DEFINITIONS.find(
            (item) =>
              item.id === walletId
          );

        if (!definition) return;

        setWalletError("");
        setWalletLoading(true);

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
            await provider.request({
              method:
                "eth_requestAccounts",
            });

          if (!accounts?.length) {
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
        } catch (error) {
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
            setWalletLoading(false);
          }
        }
      },
      [
        getProviderForWallet,
        readExternalWallet,
        showNotification,
      ]
    );

  const disconnectWallet = useCallback(
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
              connected: false,
              address: "",
              balance: null,
              network: "",
            },
          })
        );

        if (
          activeWallet ===
          walletId
        ) {
          setActiveWallet("");
          setWalletAddress("");
          setWalletType("");
          localStorage.removeItem(
            "hypertrade_wallet_address"
          );
        }

        return;
      }

      Object.keys(
        walletProviderRefs.current
      ).forEach((id) => {
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
      });

      walletProviderRefs.current = {};

      setExternalWallets({
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
      async (walletId, accounts) => {
        if (!accounts?.length) {
          disconnectWallet(
            walletId
          );
          return;
        }

        const provider =
          walletProviderRefs.current[
            walletId
          ];

        if (!provider) return;

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

        for (const definition of WALLET_DEFINITIONS) {
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
        ({ provider, handler }) => {
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

      return Array.isArray(history)
        ? history
        : [];
    }, [
      chartHistory,
      selectedPair,
    ]);

  const currentPrices =
    useMemo(
      () =>
        currentHistory
          .map((item) =>
            Number(item.price)
          )
          .filter(
            (value) =>
              Number.isFinite(
                value
              ) &&
              value > 0
          ),
      [currentHistory]
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

  const signalData =
    useMemo(
      () =>
        calculateSignal(
          activePrices
        ),
      [activePrices]
    );

  const candles =
    useMemo(
      () =>
        createCandleBuckets(
          currentHistory,
          selectedTimeframe
        ),
      [
        currentHistory,
        selectedTimeframe,
      ]
    );

  const chartMin =
    activePrices.length
      ? Math.min(...activePrices)
      : 0;

  const chartMax =
    activePrices.length
      ? Math.max(...activePrices)
      : 0;

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
    svgPathFromPrices(
      activePrices,
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
    orderType === "limit" &&
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
        orderType === "limit" &&
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
        orderType === "market" &&
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

      setOrderSubmitting(true);

      try {
        const response =
          await fetch(
            `${API_URL}/api/orders`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify(
                {
                  symbol:
                    `${selectedPair}/USDT`,
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
                }
              ),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

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

        if (
          !response.ok
        ) {
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
      } catch (error) {
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
          setOrderSubmitting(false);
        }
      }
    };

  const applySignal = () => {
    if (
      signalData.signal ===
      "BUY"
    ) {
      setOrderSide("buy");
      showNotification(
        "info",
        `Buy panel prepared for ${selectedPair}.`
      );
    } else if (
      signalData.signal ===
      "SELL"
    ) {
      setOrderSide("sell");
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
    if (!notification) return;

    const timer =
      setTimeout(() => {
        if (
          mountedRef.current
        ) {
          setNotification(null);
        }
      }, 5000);

    return () =>
      clearTimeout(timer);
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

  if (pageError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-5 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h2 className="text-xl font-bold text-red-400">
            Dashboard Error
          </h2>
          <p className="mt-3 text-sm text-zinc-300">
            {pageError}
          </p>
          <button
            type="button"
            onClick={() => {
              setPageError("");
              setLoading(true);
              loadDashboard();
            }}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const user =
    dashboard?.user || {
      fullName: "Trader",
      email: "",
    };

  const internalWalletData =
    dashboard?.wallet ||
    internalWallet;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {notification && (
        <div className="fixed right-5 top-5 z-[70] w-[min(430px,calc(100vw-40px))]">
          <div
            className={`rounded-2xl border p-4 shadow-2xl backdrop-blur ${
              notification.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : notification.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm">
                {notification.message}
              </p>
              <button
                type="button"
                onClick={() =>
                  setNotification(null)
                }
                className="text-zinc-500 hover:text-white"
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
                  signalAlert.signal === "BUY"
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
                  signalAlert.signal === "BUY"
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
              setSignalAlert(null)
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

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
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

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <p className="text-zinc-500">
            Welcome back,
          </p>
          <h2 className="mt-1 text-3xl font-black">
            {user.fullName || "Trader"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {user.email || ""}
          </p>
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
            {ASSETS.map((asset) => {
              const data =
                market[asset.symbol];

              return (
                <button
                  type="button"
                  key={asset.symbol}
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
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-xl font-black ${asset.accent}`}
                      >
                        {asset.icon}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {asset.name}
                        </p>
                      </div>
                    </div>

                    <span
                      className={
                        Number(
                          data?.change24h
                        ) >= 0
                          ? "text-sm font-semibold text-emerald-400"
                          : "text-sm font-semibold text-red-400"
                      }
                    >
                      {formatChange(
                        data?.change24h
                      )}
                    </span>
                  </div>

                  <p className="mt-6 text-2xl font-black">
                    $
                    {formatPrice(
                      data?.price,
                      asset.symbol
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                External Wallets
              </p>
              <h3 className="mt-1 text-2xl font-bold">
                Wallet Connections
              </h3>
              <p className="mt-2 text-xs text-zinc-500">
                extra function:instal wallets before choose
              </p>
            </div>

            <div className="text-xs text-zinc-600">
              Only MetaMask · Coinomi · Trust Wallet
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {WALLET_DEFINITIONS.map(
              (wallet) => {
                const state =
                  externalWallets[
                    wallet.id
                  ];

                return (
                  <div
                    key={wallet.id}
                    className="rounded-2xl border border-zinc-800 bg-[#050816] p-5"
                  >
                    <div className="flex items-center gap-4">
                      <ExternalWalletLogo
                        id={wallet.id}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold">
                          {wallet.name}
                        </h4>
                        <p className="mt-1 text-xs text-zinc-500">
                          {wallet.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-[#080D1A] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-zinc-600">
                          Status
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            state.connected
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {state.connected
                            ? "CONNECTED"
                            : "NOT CONNECTED"}
                        </span>
                      </div>

                      <p className="mt-3 break-all font-mono text-xs text-zinc-400">
                        {state.address
                          ? shortenAddress(
                              state.address
                            )
                          : "No wallet selected"}
                      </p>

                      {state.network && (
                        <p className="mt-2 text-xs text-zinc-600">
                          {state.network}
                        </p>
                      )}

                      {state.balance !==
                        null &&
                        state.connected && (
                          <p className="mt-2 text-xs text-zinc-400">
                            Native balance:{" "}
                            <span className="font-semibold text-white">
                              {state.balance}
                            </span>
                          </p>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          connectExternalWallet(
                            wallet.id
                          )
                        }
                        disabled={
                          walletLoading ||
                          state.connected
                        }
                        className="rounded-xl bg-blue-600 py-3 text-xs font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {walletLoading
                          ? "Connecting..."
                          : state.connected
                          ? "Connected"
                          : `Connect ${wallet.name}`}
                      </button>

                      <a
                        href={
                          wallet.installUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-zinc-700 py-3 text-center text-xs font-bold text-zinc-300 hover:border-zinc-500 hover:text-white"
                      >
                        Install Wallet
                      </a>
                    </div>

                    {state.connected && (
                      <button
                        type="button"
                        onClick={() =>
                          disconnectWallet(
                            wallet.id
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-red-500/20 py-2 text-xs font-semibold text-red-400 hover:border-red-500/40"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {walletAddress && (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-[#050816] p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-zinc-600">
                    Active Wallet
                  </p>
                  <p className="mt-1 font-semibold">
                    {walletType ||
                      "Wallet"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Address
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-400">
                    {walletAddress}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Network
                  </p>
                  <p className="mt-1 font-semibold">
                    {externalWallets[
                      activeWallet
                    ]?.network ||
                      networkName ||
                      "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {walletError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {walletError}
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-zinc-400">
                  Market Signal Engine
                </p>
                <SignalBadge
                  signal={
                    signalData.signal
                  }
                  confidence={
                    signalData.confidence
                  }
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-5">
                <h3 className="text-2xl font-bold">
                  {selectedPair}/USDT
                </h3>
                <span className="text-sm text-zinc-500">
                  RSI{" "}
                  <b className="text-white">
                    {signalData.rsi !==
                    null
                      ? signalData.rsi.toFixed(
                          1
                        )
                      : "—"}
                  </b>
                </span>
                <span className="text-sm text-zinc-500">
                  Trend{" "}
                  <b
                    className={
                      signalData.trend >=
                      0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {signalData.trend >=
                    0
                      ? "+"
                      : ""}
                    {signalData.trend.toFixed(
                      2
                    )}
                    %
                  </b>
                </span>
              </div>

              <p className="mt-2 max-w-4xl text-sm text-zinc-500">
                {signalData.reason}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={
                  applySignal
                }
                disabled={
                  signalData.signal ===
                  "WAIT"
                }
                className="rounded-xl border border-zinc-700 px-4 py-3 text-xs font-bold hover:border-blue-500 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply Signal
              </button>

              <button
                type="button"
                onClick={() =>
                  setSignalEnabled(
                    (value) => !value
                  )
                }
                className={`rounded-xl border px-4 py-3 text-xs font-bold ${
                  signalEnabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                {signalEnabled
                  ? "Signals ON"
                  : "Signals OFF"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowSignalDetails(
                    (value) => !value
                  )
                }
                className="rounded-xl border border-zinc-700 px-4 py-3 text-xs font-bold text-zinc-400 hover:text-white"
              >
                {showSignalDetails
                  ? "Hide"
                  : "Details"}
              </button>
            </div>
          </div>

          {showSignalDetails && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                [
                  "Confidence",
                  `${Math.round(
                    signalData.confidence
                  )}%`,
                ],
                [
                  "EMA 9",
                  signalData.ema9 !==
                  null
                    ? formatPrice(
                        signalData.ema9,
                        selectedPair
                      )
                    : "—",
                ],
                [
                  "EMA 21",
                  signalData.ema21 !==
                  null
                    ? formatPrice(
                        signalData.ema21,
                        selectedPair
                      )
                    : "—",
                ],
                [
                  "MACD",
                  signalData.macd.toFixed(
                    6
                  ),
                ],
                [
                  "Support",
                  formatPrice(
                    signalData.support,
                    selectedPair
                  ),
                ],
                [
                  "Resistance",
                  formatPrice(
                    signalData.resistance,
                    selectedPair
                  ),
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-zinc-800 bg-[#050816] p-4"
                  >
                    <p className="text-xs text-zinc-600">
                      {label}
                    </p>
                    <p className="mt-2 font-bold">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] xl:col-span-2">
            <div className="border-b border-zinc-800 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={
                        selectedPair
                      }
                      onChange={(event) =>
                        setSelectedPair(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-2 text-lg font-black outline-none focus:border-blue-500"
                    >
                      {TRADE_PAIRS.map(
                        (pair) => (
                          <option
                            key={
                              pair.symbol
                            }
                            value={
                              pair.symbol
                            }
                          >
                            {
                              pair.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <SignalBadge
                      signal={
                        signalData.signal
                      }
                      confidence={
                        signalData.confidence
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <span className="text-3xl font-black">
                      $
                      {formatPrice(
                        currentPrice,
                        selectedPair
                      )}
                    </span>

                    <span
                      className={`pb-1 text-sm font-bold ${
                        chartChange >=
                        0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {chartChange >=
                      0
                        ? "+"
                        : ""}
                      {chartChange.toFixed(
                        2
                      )}
                      %
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TIMEFRAMES.map(
                    (timeframe) => (
                      <button
                        type="button"
                        key={
                          timeframe
                        }
                        onClick={() =>
                          setSelectedTimeframe(
                            timeframe
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${
                          selectedTimeframe ===
                          timeframe
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {timeframe}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setChartType(
                        "candle"
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      chartType ===
                      "candle"
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    Candles
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setChartType(
                        "line"
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      chartType ===
                      "line"
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    Line
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setChartType(
                        "signals"
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      chartType ===
                      "signals"
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    Signal Chart
                  </button>
                </div>

                <span className="text-xs text-zinc-600">
                  {selectedTimeframe} ·{" "}
                  {currentHistory.length} ticks
                </span>
              </div>
            </div>

            <div className="relative h-[480px] overflow-hidden p-5">
              <div
                className="absolute inset-5 rounded-xl opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(113,113,122,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,.18) 1px, transparent 1px)",
                  backgroundSize:
                    "8% 10%",
                }}
              />

              {chartType === "line" && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-5 h-[calc(100%-40px)] w-[calc(100%-40px)]"
                >
                  <polyline
                    points={
                      linePoints
                    }
                    fill="none"
                    stroke={
                      chartChange >=
                      0
                        ? "#34d399"
                        : "#f87171"
                    }
                    strokeWidth="0.8"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {chartType === "signals" && (
                <>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-5 h-[calc(100%-40px)] w-[calc(100%-40px)]"
                  >
                    <polyline
                      points={
                        linePoints
                      }
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                    />

                    <line
                      x1="0"
                      x2="100"
                      y1={
                        signalData.support &&
                        chartRange
                          ? clamp(
                              100 -
                                ((signalData.support -
                                  chartMin) /
                                  chartRange) *
                                  100,
                              2,
                              98
                            )
                          : 100
                      }
                      y2={
                        signalData.support &&
                        chartRange
                          ? clamp(
                              100 -
                                ((signalData.support -
                                  chartMin) /
                                  chartRange) *
                                  100,
                              2,
                              98
                            )
                          : 100
                      }
                      stroke="#34d399"
                      strokeWidth=".5"
                      strokeDasharray="2 2"
                    />

                    <line
                      x1="0"
                      x2="100"
                      y1={
                        signalData.resistance &&
                        chartRange
                          ? clamp(
                              100 -
                                ((signalData.resistance -
                                  chartMin) /
                                  chartRange) *
                                  100,
                              2,
                              98
                            )
                          : 0
                      }
                      y2={
                        signalData.resistance &&
                        chartRange
                          ? clamp(
                              100 -
                                ((signalData.resistance -
                                  chartMin) /
                                  chartRange) *
                                  100,
                              2,
                              98
                            )
                          : 0
                      }
                      stroke="#f87171"
                      strokeWidth=".5"
                      strokeDasharray="2 2"
                    />
                  </svg>

                  <div className="absolute bottom-7 left-7 rounded-xl bg-[#050816]/90 px-4 py-3 text-xs backdrop-blur">
                    <p className="text-zinc-500">
                      Signal
                    </p>
                    <p
                      className={`mt-1 text-lg font-black ${
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

                  <div className="absolute right-7 top-7 rounded-xl bg-[#050816]/90 px-4 py-3 text-xs backdrop-blur">
                    <p className="text-zinc-500">
                      Confidence
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {Math.round(
                        signalData.confidence
                      )}
                      %
                    </p>
                  </div>
                </>
              )}

              {chartType === "candle" &&
                candles.length > 0 && (
                  <div className="absolute inset-5 flex items-center gap-1">
                    {candles.map(
                      (candle) => {
                        const high =
                          candles.reduce(
                            (value, item) =>
                              Math.max(
                                value,
                                item.high
                              ),
                            -Infinity
                          );

                        const low =
                          candles.reduce(
                            (value, item) =>
                              Math.min(
                                value,
                                item.low
                              ),
                            Infinity
                          );

                        const range =
                          high - low || 1;

                        const top =
                          ((high -
                            candle.high) /
                            range) *
                          100;

                        const bottom =
                          ((high -
                            candle.low) /
                            range) *
                          100;

                        const bodyTop =
                          ((high -
                            Math.max(
                              candle.open,
                              candle.close
                            )) /
                            range) *
                          100;

                        const bodyBottom =
                          ((high -
                            Math.min(
                              candle.open,
                              candle.close
                            )) /
                            range) *
                          100;

                        const bullish =
                          candle.close >=
                          candle.open;

                        return (
                          <div
                            key={
                              candle.time
                            }
                            className="relative h-full flex-1"
                            title={`${formatDate(
                              candle.time
                            )} | O ${formatPrice(
                              candle.open,
                              selectedPair
                            )} | H ${formatPrice(
                              candle.high,
                              selectedPair
                            )} | L ${formatPrice(
                              candle.low,
                              selectedPair
                            )} | C ${formatPrice(
                              candle.close,
                              selectedPair
                            )}`}
                          >
                            <div
                              className={`absolute left-1/2 w-[1px] -translate-x-1/2 ${
                                bullish
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                              style={{
                                top: `${top}%`,
                                height: `${Math.max(
                                  1,
                                  bottom -
                                    top
                                )}%`,
                              }}
                            />

                            <div
                              className={`absolute left-[15%] right-[15%] rounded-sm ${
                                bullish
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                              style={{
                                top: `${bodyTop}%`,
                                height: `${Math.max(
                                  2,
                                  bodyBottom -
                                    bodyTop
                                )}%`,
                              }}
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

              {currentHistory.length <
                2 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-2xl border border-zinc-800 bg-[#050816]/90 px-6 py-5 text-center backdrop-blur">
                    <p className="font-semibold">
                      Waiting for market history
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Live BTC, ETH, SOL and TRX prices will build the chart automatically.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-7 right-7">
                <SignalBadge
                  signal={
                    signalData.signal
                  }
                  confidence={
                    signalData.confidence
                  }
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 px-5 py-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div>
                  <p className="text-xs text-zinc-600">
                    High
                  </p>
                  <p className="mt-1 font-bold">
                    {formatPrice(
                      chartMax,
                      selectedPair
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Low
                  </p>
                  <p className="mt-1 font-bold">
                    {formatPrice(
                      chartMin,
                      selectedPair
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Candles
                  </p>
                  <p className="mt-1 font-bold">
                    {candles.length}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Support
                  </p>
                  <p className="mt-1 font-bold text-emerald-400">
                    {formatPrice(
                      signalData.support,
                      selectedPair
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-600">
                    Resistance
                  </p>
                  <p className="mt-1 font-bold text-red-400">
                    {formatPrice(
                      signalData.resistance,
                      selectedPair
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Trading
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {selectedPair}/
                  {selectedPairInfo.quote}
                </h3>
              </div>

              <span className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400">
                Fee 0.5%
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#050816] p-1">
              <button
                type="button"
                onClick={() =>
                  setOrderSide("buy")
                }
                className={`rounded-lg py-3 text-sm font-bold ${
                  orderSide ===
                  "buy"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Buy
              </button>

              <button
                type="button"
                onClick={() =>
                  setOrderSide("sell")
                }
                className={`rounded-lg py-3 text-sm font-bold ${
                  orderSide ===
                  "sell"
                    ? "bg-red-500 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Sell
              </button>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs text-zinc-600">
                Asset / Pair
              </p>

              <select
                value={
                  selectedPair
                }
                onChange={(event) =>
                  setSelectedPair(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
              >
                {TRADE_PAIRS.map(
                  (pair) => (
                    <option
                      key={
                        pair.symbol
                      }
                      value={
                        pair.symbol
                      }
                    >
                      {pair.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-5">
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
                      event.target.value
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
                    {selectedPairInfo.quote}
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
                    event.target.value
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
                  {selectedPairInfo.quote}
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
                  {selectedPairInfo.quote}
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
                    {selectedPairInfo.quote}
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
          </div>
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
              ([symbol, balance]) => (
                <div
                  key={symbol}
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
                    .slice(0, 50)
                    .map((order) => (
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
                    ))}
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
