import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000";
const MARKET_WS_URL = "ws://localhost:3000/ws/market";

const FEE_RATE = 0.005; // 0.5%

const initialMarket = {
  BTC: { price: 0, change24h: 0 },
  ETH: { price: 0, change24h: 0 },
  SOL: { price: 0, change24h: 0 },
  USDT: { price: 1, change24h: 0 },
};

const assets = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    icon: "₿",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "Ξ",
  },
  {
    symbol: "SOL",
    name: "Solana",
    icon: "S",
  },
  {
    symbol: "USDT",
    name: "Tether",
    icon: "$",
  },
];

export default function Trade() {
  const navigate = useNavigate();

  const [market, setMarket] = useState(initialMarket);
  const [marketConnected, setMarketConnected] = useState(false);

  const [selectedAsset, setSelectedAsset] =
    useState("BTC");

  const [side, setSide] = useState("buy");

  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(
      "hypertrade_token"
    );

    if (!token) {
      navigate("/");
      return;
    }

    connectMarket();
  }, [navigate]);

  function connectMarket() {
    let socket;

    try {
      socket = new WebSocket(
        MARKET_WS_URL
      );

      socket.onopen = () => {
        console.log(
          "📡 Trade market WebSocket connected"
        );

        setMarketConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const response =
            JSON.parse(event.data);

          const data =
            response?.data || response;

          if (!data) return;

          setMarket((previous) => ({
            ...previous,

            BTC: data.BTC
              ? {
                  ...previous.BTC,
                  ...data.BTC,
                }
              : previous.BTC,

            ETH: data.ETH
              ? {
                  ...previous.ETH,
                  ...data.ETH,
                }
              : previous.ETH,

            SOL: data.SOL
              ? {
                  ...previous.SOL,
                  ...data.SOL,
                }
              : previous.SOL,

            USDT: data.USDT
              ? {
                  ...previous.USDT,
                  ...data.USDT,
                }
              : previous.USDT,
          }));
        } catch (err) {
          console.error(
            "Trade market message error:",
            err
          );
        }
      };

      socket.onerror = () => {
        setMarketConnected(false);
      };

      socket.onclose = () => {
        setMarketConnected(false);
      };
    } catch (err) {
      console.error(
        "Trade WebSocket error:",
        err
      );
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }

  const currentPrice =
    Number(
      market[selectedAsset]?.price || 0
    );

  const numericAmount =
    Number(amount || 0);

  const subtotal =
    currentPrice * numericAmount;

  const fee =
    subtotal * FEE_RATE;

  const total =
    side === "buy"
      ? subtotal + fee
      : subtotal - fee;

  const formattedPrice =
    currentPrice > 0
      ? currentPrice.toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              currentPrice < 10 ? 2 : 2,
            maximumFractionDigits:
              currentPrice < 10 ? 6 : 2,
          }
        )
      : "Loading...";

  const formattedSubtotal =
    subtotal.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  const formattedFee =
    fee.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  const formattedTotal =
    total.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  const canSubmit = useMemo(() => {
    return (
      numericAmount > 0 &&
      currentPrice > 0 &&
      !loading
    );
  }, [
    numericAmount,
    currentPrice,
    loading,
  ]);

  function handleAmountChange(event) {
    const value =
      event.target.value;

    if (value === "") {
      setAmount("");
      return;
    }

    if (
      !/^\d*\.?\d*$/.test(value)
    ) {
      return;
    }

    setAmount(value);
    setError("");
    setMessage("");
  }

  async function handleOrder(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!canSubmit) {
      setError(
        "Please enter a valid amount."
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

    setLoading(true);

    try {
      /*
       * فعلاً سفارش را به Backend
       * ارسال می‌کنیم.
       *
       * Endpoint در مرحله بعدی
       * ساخته خواهد شد.
       */

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

            body: JSON.stringify({
              symbol:
                selectedAsset,

              side,

              amount:
                numericAmount,

              price:
                currentPrice,

              fee,

              total,
            }),
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          "hypertrade_token"
        );

        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to create order."
        );
      }

      setMessage(
        "Order created successfully."
      );

      setAmount("");
    } catch (err) {
      console.error(
        "Order error:",
        err
      );

      /*
       * اگر Backend سفارش هنوز
       * ساخته نشده باشد، این پیام
       * نمایش داده می‌شود.
       */
      setError(
        err.message ||
          "Unable to create order."
      );
    } finally {
      setLoading(false);
    }
  }

  function goDashboard() {
    navigate("/dashboard");
  }

  const selected =
    assets.find(
      (asset) =>
        asset.symbol ===
        selectedAsset
    );

  return (
    <div className="min-h-screen bg-[#050816] text-white">

      {/* HEADER */}

      <header className="border-b border-zinc-800 bg-[#080D1A]">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold">
              Hyper Trade
            </h1>

            <p className="text-sm text-zinc-500">
              Spot Trading
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
              onClick={goDashboard}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm transition hover:border-blue-500"
            >
              Dashboard
            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* MARKET SELECTOR */}

        <section className="mb-8">

          <h2 className="mb-5 text-2xl font-bold">
            Markets
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {assets.map(
              (asset) => {
                const item =
                  market[
                    asset.symbol
                  ];

                const change =
                  Number(
                    item?.change24h ||
                      0
                  );

                const active =
                  selectedAsset ===
                  asset.symbol;

                return (
                  <button
                    key={
                      asset.symbol
                    }
                    type="button"
                    onClick={() =>
                      setSelectedAsset(
                        asset.symbol
                      )
                    }
                    className={`rounded-2xl border p-5 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-zinc-800 bg-[#0A0F1E] hover:border-zinc-700"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 font-bold">
                          {
                            asset.icon
                          }
                        </div>

                        <div>

                          <p className="font-semibold">
                            {
                              asset.symbol
                            }
                          </p>

                          <p className="text-xs text-zinc-500">
                            {
                              asset.name
                            }
                          </p>

                        </div>

                      </div>

                      <span
                        className={
                          change >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {change >= 0
                          ? "+"
                          : ""}
                        {change.toFixed(
                          2
                        )}
                        %
                      </span>

                    </div>

                    <p className="mt-5 text-xl font-bold">
                      $
                      {item?.price
                        ? Number(
                            item.price
                          ).toLocaleString(
                            "en-US",
                            {
                              maximumFractionDigits:
                                6,
                            }
                          )
                        : "Loading..."}
                    </p>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* TRADE */}

        <section className="grid gap-6 lg:grid-cols-3">

          {/* CHART */}

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6 lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-zinc-500">
                  Selected Market
                </p>

                <h2 className="mt-1 text-3xl font-bold">

                  {selected?.icon}{" "}
                  {
                    selectedAsset
                  }

                  <span className="ml-3 text-lg text-zinc-500">
                    /
                    USDT
                  </span>

                </h2>

              </div>

              <div className="text-right">

                <p className="text-sm text-zinc-500">
                  Current Price
                </p>

                <p className="text-2xl font-bold">
                  $
                  {
                    formattedPrice
                  }
                </p>

              </div>

            </div>

            <div className="mt-8 flex h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-[#050816]">

              <div className="text-center">

                <div className="mb-3 text-4xl">
                  📈
                </div>

                <p className="font-semibold">
                  Trading Chart
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Live chart will be
                  connected here.
                </p>

              </div>

            </div>

          </div>

          {/* ORDER PANEL */}

          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">

            <h2 className="text-2xl font-bold">
              Trade
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {selectedAsset}
              /USDT
            </p>

            {/* BUY / SELL */}

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#050816] p-1">

              <button
                type="button"
                onClick={() =>
                  setSide("buy")
                }
                className={`rounded-lg py-3 font-semibold transition ${
                  side === "buy"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Buy
              </button>

              <button
                type="button"
                onClick={() =>
                  setSide("sell")
                }
                className={`rounded-lg py-3 font-semibold transition ${
                  side === "sell"
                    ? "bg-red-500 text-white"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Sell
              </button>

            </div>

            {/* ORDER FORM */}

            <form
              onSubmit={
                handleOrder
              }
              className="mt-6 space-y-5"
            >

              {/* PRICE */}

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Market Price
                </label>

                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3">

                  <span className="text-zinc-400">
                    Price
                  </span>

                  <span className="font-semibold">
                    $
                    {
                      formattedPrice
                    }
                  </span>

                </div>

              </div>

              {/* AMOUNT */}

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Amount (
                  {
                    selectedAsset
                  }
                  )
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={
                    handleAmountChange
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-800 bg-[#050816] px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-blue-500"
                />

              </div>

              {/* SUMMARY */}

              <div className="space-y-3 rounded-xl border border-zinc-800 bg-[#050816] p-4">

                <div className="flex justify-between text-sm">

                  <span className="text-zinc-500">
                    Subtotal
                  </span>

                  <span>
                    $
                    {
                      formattedSubtotal
                    }
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-zinc-500">
                    Trading Fee
                  </span>

                  <span className="text-yellow-400">
                    0.5%
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-zinc-500">
                    Fee Amount
                  </span>

                  <span>
                    $
                    {
                      formattedFee
                    }
                  </span>

                </div>

                <div className="border-t border-zinc-800 pt-3">

                  <div className="flex justify-between">

                    <span className="font-semibold">
                      {side === "buy"
                        ? "Total"
                        : "Receive"}
                    </span>

                    <span className="text-xl font-bold">
                      $
                      {
                        formattedTotal
                      }
                    </span>

                  </div>

                </div>

              </div>

              {/* MESSAGE */}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  {message}
                </div>
              )}

              {/* BUTTON */}

              <button
                type="submit"
                disabled={
                  !canSubmit
                }
                className={`w-full rounded-xl py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  side === "buy"
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >

                {loading
                  ? "Processing..."
                  : side === "buy"
                  ? `Buy ${selectedAsset}`
                  : `Sell ${selectedAsset}`}

              </button>

            </form>

          </div>

        </section>

      </main>

    </div>
  );
}