const WebSocket =
  require("ws");

const { getMarketSnapshot } = require('./internal-market.engine');

const {
  getAllOrderBooks,
  getAllTimeAndSales,
} = require(
  "./orderbook.service"
);

/* =========================================================
   CLIENTS
========================================================= */

const clients =
  new Set();

/* =========================================================
   MARKET PRICES
========================================================= */

let marketPrices = {
  BTC: {
    price: 0,
    change24h: 0,
  },

  ETH: {
    price: 0,
    change24h: 0,
  },

  SOL: {
    price: 0,
    change24h: 0,
  },

  TRX: {
    price: 0,
    change24h: 0,
  },

  USDT: {
    price: 0,
    change24h: 0,
  },
};

/* =========================================================
   TIMERS
========================================================= */

let updateTimer =
  null;

let firstUpdateTimer =
  null;

let pingTimer =
  null;

let microstructureTimer =
  null;

/* =========================================================
   STATE
========================================================= */

let updating =
  false;

let microstructureUpdating =
  false;

let marketWss =
  null;

/* =========================================================
   INTERNAL MICROSTRUCTURE STATE
========================================================= */

let orderBookState = {
  "BTC/USDT": {
    symbol:
      "BTC/USDT",
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    spreadPercent:
      null,
    source:
      "Hyper Trade Internal Order Book",
    updatedAt:
      null,
  },

  "ETH/USDT": {
    symbol:
      "ETH/USDT",
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    spreadPercent:
      null,
    source:
      "Hyper Trade Internal Order Book",
    updatedAt:
      null,
  },

  "SOL/USDT": {
    symbol:
      "SOL/USDT",
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    spreadPercent:
      null,
    source:
      "Hyper Trade Internal Order Book",
    updatedAt:
      null,
  },

  "TRX/USDT": {
    symbol:
      "TRX/USDT",
    bids: [],
    asks: [],
    bestBid: null,
    bestAsk: null,
    spread: null,
    spreadPercent:
      null,
    source:
      "Hyper Trade Internal Order Book",
    updatedAt:
      null,
  },
};

let timeAndSalesState = {
  "BTC/USDT": {
    symbol:
      "BTC/USDT",
    trades: [],
    source:
      "Hyper Trade Internal Trade Feed",
    updatedAt:
      null,
  },

  "ETH/USDT": {
    symbol:
      "ETH/USDT",
    trades: [],
    source:
      "Hyper Trade Internal Trade Feed",
    updatedAt:
      null,
  },

  "SOL/USDT": {
    symbol:
      "SOL/USDT",
    trades: [],
    source:
      "Hyper Trade Internal Trade Feed",
    updatedAt:
      null,
  },

  "TRX/USDT": {
    symbol:
      "TRX/USDT",
    trades: [],
    source:
      "Hyper Trade Internal Trade Feed",
    updatedAt:
      null,
  },
};

/* =========================================================
   FETCH MARKET PRICES
========================================================= */

async function fetchMarketPrices() {
  if (updating) return marketPrices;

  updating = true;

  try {
    const internalMarket =
      getMarketSnapshot();

    for (
      const symbol of Object.keys(
        marketPrices
      )
    ) {
      const snapshot =
        internalMarket?.[
          symbol
        ];

      if (!snapshot) {
        continue;
      }

      const price =
        Number(
          snapshot.price
        );

      const change =
        Number(
          snapshot.change24h
        );

      if (
        Number.isFinite(price) &&
        price > 0
      ) {
        marketPrices[
          symbol
        ].price = price;
      }

      if (
        Number.isFinite(change)
      ) {
        marketPrices[
          symbol
        ].change24h = change;
      }
    }

    broadcastPrices();

    console.log(
      `📊 Internal market updated | ` +
        `BTC: $${marketPrices.BTC.price} | ` +
        `ETH: $${marketPrices.ETH.price} | ` +
        `SOL: $${marketPrices.SOL.price} | ` +
        `TRX: $${marketPrices.TRX.price} | ` +
        `USDT: $${marketPrices.USDT.price}`
    );

    return marketPrices;
  } catch (error) {
    console.error(
      "❌ Internal market price update failed:",
      error.message
    );

    return marketPrices;
  } finally {
    updating = false;
  }
}

async function fetchExternalMarketPricesLegacy() {
  if (
    updating
  ) {
    return marketPrices;
  }

  updating =
    true;

  try {
    const response =
      await fetch(
        "https://api.coingecko.com/api/v3/simple/price" +
          "?ids=bitcoin,ethereum,solana,tron,tether" +
          "&vs_currencies=usd&include_24hr_change=true"
      );

    if (
      response.status ===
      429
    ) {
      console.warn(
        "⚠️ Market API rate limit reached. Keeping previous prices."
      );

      return marketPrices;
    }

    if (
      !response.ok
    ) {
      throw new Error(
        `Market API returned ${response.status}`
      );
    }

    const data =
      await response.json();

    const map = {
      BTC:
        "bitcoin",

      ETH:
        "ethereum",

      SOL:
        "solana",

      TRX:
        "tron",

      USDT:
        "tether",
    };

    for (
      const [
        symbol,
        id,
      ] of Object.entries(
        map
      )
    ) {
      const price =
        Number(
          data?.[id]?.usd
        );

      const change =
        Number(
          data?.[id]
            ?.usd_24h_change
        );

      if (
        Number.isFinite(
          price
        ) &&
        price > 0
      ) {
        marketPrices[
          symbol
        ].price =
          price;
      }

      if (
        Number.isFinite(
          change
        )
      ) {
        marketPrices[
          symbol
        ].change24h =
          change;
      }
    }

    broadcastPrices();

    console.log(
      `📊 Market updated | ` +
        `BTC: $${marketPrices.BTC.price} | ` +
        `ETH: $${marketPrices.ETH.price} | ` +
        `SOL: $${marketPrices.SOL.price} | ` +
        `TRX: $${marketPrices.TRX.price} | ` +
        `USDT: $${marketPrices.USDT.price}`
    );

    return marketPrices;
  } catch (
    error
  ) {
    console.error(
      "❌ Market price update failed:",
      error.message
    );

    return marketPrices;
  } finally {
    updating =
      false;
  }
}

/* =========================================================
   BROADCAST MARKET PRICES
========================================================= */

function broadcastPrices() {
  const message =
    JSON.stringify({
      type:
        "market",

      data:
        marketPrices,
    });

  for (
    const client of clients
  ) {
    if (
      client.readyState !==
      WebSocket.OPEN
    ) {
      clients.delete(
        client
      );

      continue;
    }

    try {
      client.send(
        message
      );
    } catch (
      error
    ) {
      console.error(
        "❌ WebSocket send error:",
        error.message
      );

      try {
        client.terminate();
      } catch (
        _
      ) {}

      clients.delete(
        client
      );
    }
  }
}

/* =========================================================
   BROADCAST ORDER BOOK
========================================================= */

function broadcastOrderBooks() {
  const message =
    JSON.stringify({
      type:
        "orderbook",

      data:
        orderBookState,

      source:
        "Hyper Trade Internal Order Book",

      timestamp:
        new Date().toISOString(),
    });

  for (
    const client of clients
  ) {
    if (
      client.readyState !==
      WebSocket.OPEN
    ) {
      clients.delete(
        client
      );

      continue;
    }

    try {
      client.send(
        message
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Order book WebSocket send error:",
        error.message
      );

      try {
        client.terminate();
      } catch (
        _
      ) {}

      clients.delete(
        client
      );
    }
  }
}

/* =========================================================
   BROADCAST TIME & SALES
========================================================= */

function broadcastTimeAndSales() {
  const message =
    JSON.stringify({
      type:
        "time_and_sales",

      data:
        timeAndSalesState,

      source:
        "Hyper Trade Internal Trade Feed",

      timestamp:
        new Date().toISOString(),
    });

  for (
    const client of clients
  ) {
    if (
      client.readyState !==
      WebSocket.OPEN
    ) {
      clients.delete(
        client
      );

      continue;
    }

    try {
      client.send(
        message
      );
    } catch (
      error
    ) {
      console.error(
        "❌ Time & Sales WebSocket send error:",
        error.message
      );

      try {
        client.terminate();
      } catch (
        _
      ) {}

      clients.delete(
        client
      );
    }
  }
}

/* =========================================================
   BROADCAST FULL MICROSTRUCTURE
========================================================= */

function broadcastMicrostructure() {
  broadcastOrderBooks();

  broadcastTimeAndSales();
}

/* =========================================================
   FETCH CURRENT MICROSTRUCTURE
========================================================= */

async function fetchMarketMicrostructure() {
  if (
    microstructureUpdating
  ) {
    return {
      orderBooks:
        orderBookState,

      timeAndSales:
        timeAndSalesState,
    };
  }

  microstructureUpdating =
    true;

  try {
    const [
      orderBooks,
      timeAndSales,
    ] =
      await Promise.all([
        getAllOrderBooks(
          20
        ),

        getAllTimeAndSales(
          50
        ),
      ]);

    orderBookState =
      orderBooks;

    timeAndSalesState =
      timeAndSales;

    broadcastMicrostructure();

    return {
      orderBooks:
        orderBookState,

      timeAndSales:
        timeAndSalesState,
    };
  } catch (
    error
  ) {
    console.error(
      "❌ Internal market microstructure update failed:",
      error.message
    );

    return {
      orderBooks:
        orderBookState,

      timeAndSales:
        timeAndSalesState,
    };
  } finally {
    microstructureUpdating =
      false;
  }
}

/* =========================================================
   SEND CURRENT PRICES
========================================================= */

function sendCurrentPrices(
  client
) {
  if (
    !client ||
    client.readyState !==
      WebSocket.OPEN
  ) {
    return;
  }

  try {
    client.send(
      JSON.stringify({
        type:
          "market",

        data:
          marketPrices,
      })
    );
  } catch (
    error
  ) {
    console.error(
      "❌ Failed to send current market:",
      error.message
    );
  }
}

/* =========================================================
   SEND CURRENT ORDER BOOK
========================================================= */

function sendCurrentOrderBook(
  client
) {
  if (
    !client ||
    client.readyState !==
      WebSocket.OPEN
  ) {
    return;
  }

  try {
    client.send(
      JSON.stringify({
        type:
          "orderbook",

        data:
          orderBookState,

        source:
          "Hyper Trade Internal Order Book",

        timestamp:
          new Date().toISOString(),
      })
    );
  } catch (
    error
  ) {
    console.error(
      "❌ Failed to send current order book:",
      error.message
    );
  }
}

/* =========================================================
   SEND CURRENT TIME & SALES
========================================================= */

function sendCurrentTimeAndSales(
  client
) {
  if (
    !client ||
    client.readyState !==
      WebSocket.OPEN
  ) {
    return;
  }

  try {
    client.send(
      JSON.stringify({
        type:
          "time_and_sales",


      })
    );
  } catch (
    error
  ) {
    console.error(
      "❌ Failed to send current Time & Sales:",
      error.message
    );
  }
}

/* =========================================================
   HEARTBEAT
========================================================= */

function startHeartbeat() {
  if (
    pingTimer
  ) {
    clearInterval(
      pingTimer
    );
  }

  pingTimer =
    setInterval(
      () => {
        for (
          const client of clients
        ) {
          if (
            client.readyState !==
            WebSocket.OPEN
          ) {
            clients.delete(
              client
            );

            continue;
          }

          try {
            client.ping();
          } catch (
            _
          ) {
            try {
              client.terminate();
            } catch (
              _
            ) {}

            clients.delete(
              client
            );
          }
        }
      },
      30000
    );
}

/* =========================================================
   MARKET WEBSOCKET START
========================================================= */

function startMarketSocket(
  server
) {
  if (
    marketWss
  ) {
    return marketWss;
  }

  if (!server) {
    throw new Error(
      "Market WebSocket requires the HTTP server instance."
    );
  }

  marketWss =
    new WebSocket.Server({
      server,

      path:
        "/ws/market",

      clientTracking:
        true,
    });

  marketWss.on(
    "connection",
    async (client) => {
      console.log(
        "🔌 Market client connected"
      );

      clients.add(
        client
      );

      sendCurrentPrices(
        client
      );

      sendCurrentOrderBook(
        client
      );

      sendCurrentTimeAndSales(
        client
      );

      client.on(
        "close",
        () => {
          clients.delete(
            client
          );

          console.log(
            "🔌 Market client disconnected"
          );
        }
      );

      client.on(
        "error",
        (error) => {
          console.error(
            "❌ Market client error:",
            error.message
          );

          clients.delete(
            client
          );
        }
      );

      try {
        await fetchMarketMicrostructure();

        sendCurrentOrderBook(
          client
        );

        sendCurrentTimeAndSales(
          client
        );
      } catch (
        error
      ) {
        console.error(
          "❌ Initial microstructure load failed:",
          error.message
        );
      }
    }
  );

  marketWss.on(
    "error",
    (error) => {
      console.error(
        "❌ Market WebSocket server error:",
        error.message
      );
    }
  );

  startHeartbeat();

  firstUpdateTimer =
    setTimeout(
      () => {
        fetchMarketPrices();
      },
      1000
    );

  updateTimer =
    setInterval(
      () => {
        fetchMarketPrices();
      },
      20000
    );

  microstructureTimer =
    setInterval(
      () => {
        fetchMarketMicrostructure();
      },
      2000
    );

  console.log(
    "📡 Market WebSocket started"
  );

  console.log(
    "🔒 Market prices are sourced from Hyper Trade Internal Market Engine"
  );

  console.log(
    "📚 Real-time internal Order Book feed enabled"
  );

  console.log(
    "💱 Real-time internal Time & Sales feed enabled"
  );

  console.log(
    "🚫 External market price API dependency disabled by default"
  );

  void fetchMarketMicrostructure();

  return marketWss;
}

/* =========================================================
   MARKET WEBSOCKET STOP
========================================================= */

function stopMarketSocket() {
  if (
    firstUpdateTimer
  ) {
    clearTimeout(
      firstUpdateTimer
    );

    firstUpdateTimer =
      null;
  }

  if (
    updateTimer
  ) {
    clearInterval(
      updateTimer
    );

    updateTimer =
      null;
  }

  if (
    microstructureTimer
  ) {
    clearInterval(
      microstructureTimer
    );

    microstructureTimer =
      null;
  }

  if (
    pingTimer
  ) {
    clearInterval(
      pingTimer
    );

    pingTimer =
      null;
  }

  for (
    const client of clients
  ) {
    try {
      client.close(
        1000,
        "Server shutting down"
      );
    } catch (
      _
    ) {}
  }

  clients.clear();

  if (
    marketWss
  ) {
    try {
      marketWss.close();
    } catch (
      _
    ) {}

    marketWss =
      null;
  }

  console.log(
    "🛑 Market WebSocket stopped"
  );
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  startMarketSocket,
  stopMarketSocket,
  fetchMarketPrices,
  fetchMarketMicrostructure,
};
