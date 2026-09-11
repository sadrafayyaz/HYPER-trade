import { useEffect, useMemo, useState } from "react";

const TIMEFRAMES = [
  { label: "1m", size: 20 },
  { label: "5m", size: 40 },
  { label: "15m", size: 60 },
  { label: "1h", size: 90 },
  { label: "1D", size: 120 },
];

export default function MarketChart({
  symbol,
  price,
}) {
  const [timeframe, setTimeframe] =
    useState("1m");

  const [candles, setCandles] =
    useState([]);

  useEffect(() => {
    if (!price) return;

    setCandles((previous) => {
      const next = [...previous];

      const last =
        next[next.length - 1];

      if (!last) {
        next.push({
          open: price,
          high: price,
          low: price,
          close: price,
        });

        return next;
      }

      const movement =
        Math.random();

      if (movement > 0.72) {
        next.push({
          open: last.close,
          high: price,
          low: Math.min(
            last.close,
            price
          ),
          close: price,
        });
      } else {
        last.high = Math.max(
          last.high,
          price
        );

        last.low = Math.min(
          last.low,
          price
        );

        last.close = price;
      }

      const limit =
        TIMEFRAMES.find(
          (t) =>
            t.label ===
            timeframe
        )?.size || 20;

      return next.slice(-limit);
    });
  }, [price, timeframe]);

  const chart = useMemo(() => {
    if (
      candles.length === 0
    ) {
      return {
        min: 0,
        max: 0,
      };
    }

    const highs =
      candles.map(
        (c) => c.high
      );

    const lows =
      candles.map(
        (c) => c.low
      );

    return {
      max: Math.max(
        ...highs
      ),
      min: Math.min(
        ...lows
      ),
    };
  }, [candles]);

  const height = 260;
  const width = 800;

  const range =
    chart.max - chart.min || 1;

  const y = (value) =>
    20 +
    ((chart.max - value) /
      range) *
      (height - 40);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">

      <div className="mb-5 flex items-center justify-between">

        <div>

          <h3 className="text-2xl font-bold">
            {symbol}/USDT
          </h3>

          <p className="text-zinc-500">
            ${Number(price || 0).toLocaleString()}
          </p>

        </div>

        <div className="flex gap-2">

          {TIMEFRAMES.map(
            (item) => (
              <button
                key={item.label}
                onClick={() =>
                  setTimeframe(
                    item.label
                  )
                }
                className={`rounded-lg px-3 py-1 text-sm ${
                  timeframe ===
                  item.label
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            )
          )}

        </div>

      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[260px] w-full"
      >

        {[0, 1, 2, 3, 4].map(
          (i) => {
            const py =
              20 +
              (i / 4) *
                (height - 40);

            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={py}
                  x2={width}
                  y2={py}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                />

                <text
                  x="6"
                  y={py - 4}
                  fill="#71717a"
                  fontSize="12"
                >
                  $
                  {(
                    chart.max -
                    (range *
                      i) /
                      4
                  ).toFixed(0)}
                </text>

              </g>
            );
          }
        )}

        {candles.map(
          (candle, index) => {
            const gap =
              width /
              candles.length;

            const x =
              index * gap +
              gap / 2;

            const color =
              candle.close >=
              candle.open
                ? "#10b981"
                : "#ef4444";

            const bodyTop = Math.min(
              y(candle.open),
              y(candle.close)
            );

            const bodyBottom = Math.max(
              y(candle.open),
              y(candle.close)
            );

            return (
              <g key={index}>

                <line
                  x1={x}
                  y1={y(candle.high)}
                  x2={x}
                  y2={y(candle.low)}
                  stroke={color}
                  strokeWidth="2"
                />

                <rect
                  x={x - 6}
                  y={bodyTop}
                  width="12"
                  height={Math.max(
                    3,
                    bodyBottom - bodyTop
                  )}
                  rx="2"
                  fill={color}
                />

              </g>
            );
          }
        )}

      </svg>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">

        <span>
          Candles: {candles.length}
        </span>

        <span>
          High: $
          {chart.max.toFixed(2)}
        </span>

        <span>
          Low: $
          {chart.min.toFixed(2)}
        </span>

      </div>

    </div>
  );
}