const { getMarketSnapshot } = require('./internal-market.engine');

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price";

async function getPrices() {
  const internalMarket =
    getMarketSnapshot();

  return {
    BTC: {
      price:
        internalMarket.BTC?.price ?? 0,
      change24h:
        internalMarket.BTC?.change24h ?? 0,
    },

    ETH: {
      price:
        internalMarket.ETH?.price ?? 0,
      change24h:
        internalMarket.ETH?.change24h ?? 0,
    },

    SOL: {
      price:
        internalMarket.SOL?.price ?? 0,
      change24h:
        internalMarket.SOL?.change24h ?? 0,
    },

    USDT: {
      price:
        internalMarket.USDT?.price ?? 0,
      change24h:
        internalMarket.USDT?.change24h ?? 0,
    },

    TRX: {
      price:
        internalMarket.TRX?.price ?? 0,
      change24h:
        internalMarket.TRX?.change24h ?? 0,
    },
  };

  /*
   * Legacy external market-price fallback.
   * Disabled by default.
   */
  if (
    process.env.ALLOW_EXTERNAL_MARKET_SOURCE !==
    "true"
  ) {
    throw new Error(
      "Internal market price service is unavailable."
    );
  }

  const response = await fetch(
    `${COINGECKO_URL}?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd&include_24hr_change=true`
  );

  if (!response.ok) {
    throw new Error("Market price service unavailable");
  }

  const data = await response.json();

  return {
    BTC: {
      price: data.bitcoin?.usd ?? 0,
      change24h: data.bitcoin?.usd_24h_change ?? 0,
    },

    ETH: {
      price: data.ethereum?.usd ?? 0,
      change24h: data.ethereum?.usd_24h_change ?? 0,
    },

    SOL: {
      price: data.solana?.usd ?? 0,
      change24h: data.solana?.usd_24h_change ?? 0,
    },

    USDT: {
      price: data.tether?.usd ?? 0,
      change24h: data.tether?.usd_24h_change ?? 0,
    },
  };
}

module.exports = {
  getPrices,
};