const prisma = require("../prisma");

const SUPPORTED_SYMBOLS = {
  "BTC/USDT": true,
  "ETH/USDT": true,
  "SOL/USDT": true,
  "TRX/USDT": true,
};

function normalizeSymbol(symbol) {
  const normalized = String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "/");

  if (!SUPPORTED_SYMBOLS[normalized]) {
    throw new Error("Unsupported trading pair.");
  }

  return normalized;
}

function decimalToNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function aggregateLevels(
  orders,
  side
) {
  const levels = new Map();

  for (const order of orders) {
    const price =
      decimalToNumber(
        order.price
      );

    const amount =
      decimalToNumber(
        order.amount
      );

    if (
      price <= 0 ||
      amount <= 0
    ) {
      continue;
    }

    const key =
      price.toFixed(12);

    const existing =
      levels.get(key);

    if (existing) {
      existing.size += amount;
      existing.orders += 1;
    } else {
      levels.set(key, {
        price,
        size: amount,
        orders: 1,
      });
    }
  }

  const sorted =
    Array.from(
      levels.values()
    ).sort(
      (a, b) =>
        side === "BUY"
          ? b.price - a.price
          : a.price - b.price
    );

  let cumulative = 0;

  return sorted
    .slice(0, 50)
    .map((level) => {
      cumulative +=
        level.size;

      return {
        price:
          level.price,
        size:
          level.size,
        total:
          cumulative,
        orders:
          level.orders,
      };
    });
}

async function getOrderBook(
  symbol,
  limit = 20
) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      50
    );

  const orders =
    await prisma.order.findMany({
      where: {
        symbol:
          normalizedSymbol,

        type:
          "LIMIT",

        status:
          "PENDING",
      },

      orderBy: [
        {
          price:
            "desc",
        },

        {
          createdAt:
            "asc",
        },
      ],

      take: 1000,

      select: {
        id: true,
        side: true,
        price: true,
        amount: true,
        createdAt: true,
      },
    });

  const bids =
    aggregateLevels(
      orders.filter(
        (order) =>
          order.side ===
          "BUY"
      ),
      "BUY"
    ).slice(
      0,
      safeLimit
    );

  const asks =
    aggregateLevels(
      orders.filter(
        (order) =>
          order.side ===
          "SELL"
      ),
      "SELL"
    ).slice(
      0,
      safeLimit
    );

  const bestBid =
    bids[0]?.price ??
    null;

  const bestAsk =
    asks[0]?.price ??
    null;

  const spread =
    bestBid !== null &&
    bestAsk !== null
      ? bestAsk -
        bestBid
      : null;

  const spreadPercent =
    spread !== null &&
    bestBid > 0
      ? (spread /
          bestBid) *
        100
      : null;

  return {
    symbol:
      normalizedSymbol,

    bids,

    asks,

    bestBid,

    bestAsk,

    spread,

    spreadPercent,

    source:
      "Hyper Trade Internal Order Book",

    updatedAt:
      new Date().toISOString(),
  };
}

async function getTimeAndSales(
  symbol,
  limit = 50
) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      200
    );

  const orders =
    await prisma.order.findMany({
      where: {
        symbol:
          normalizedSymbol,

        status:
          "COMPLETED",

        type: {
          in: [
            "MARKET",
            "LIMIT",
          ],
        },
      },

      orderBy: [
        {
          executedAt:
            "desc",
        },

        {
          createdAt:
            "desc",
        },
      ],

      take: safeLimit,

      select: {
        id: true,
        side: true,
        amount: true,
        price: true,
        total: true,
        fee: true,
        createdAt: true,
        executedAt: true,
      },
    });

  return {
    symbol:
      normalizedSymbol,

    trades:
      orders.map(
        (order) => ({
          id:
            order.id,

          side:
            order.side,

          price:
            decimalToNumber(
              order.price
            ),

          size:
            decimalToNumber(
              order.amount
            ),

          total:
            decimalToNumber(
              order.total
            ),

          fee:
            decimalToNumber(
              order.fee
            ),

          time:
            order.executedAt ||
            order.createdAt,
        })
      ),

    source:
      "Hyper Trade Internal Trade Feed",

    updatedAt:
      new Date().toISOString(),
  };
}

module.exports = {
  SUPPORTED_SYMBOLS,
  getOrderBook,
  getTimeAndSales,
};