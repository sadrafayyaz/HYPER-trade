const express = require(
  "express"
);

const authenticateToken =
  require(
    "../middlewares/auth.middleware"
  );

const {
  SUPPORTED_SYMBOLS,
} = require(
  "../services/internal-market.engine"
);

const {
  TIMEFRAMES,
  getSignal,
  getAllSignals,
  getCachedSignals,
  getSignalMarketSnapshot,
} = require(
  "../services/signal.engine"
);

const {
  buildCandles,
} = require(
  "../services/candle.engine"
);

const router =
  express.Router();

router.use(
  authenticateToken
);

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
      "Unsupported signal symbol."
    );
  }

  return normalized;
}

function normalizeTimeframe(
  value
) {
  const normalized =
    String(
      value || "1H"
    ).trim();

  if (
    !TIMEFRAMES.includes(
      normalized
    )
  ) {
    throw new Error(
      "Unsupported signal timeframe."
    );
  }

  return normalized;
}

router.get(
  "/",
  (req, res) => {
    try {
      const timeframe =
        normalizeTimeframe(
          req.query.timeframe
        );

      return res.json({
        success: true,

        data: {
          source:
            "Hyper Trade Internal Market",

          timeframe,

          signals:
            getAllSignals(
              timeframe
            ),
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

router.get(
  "/market",
  (_req, res) => {
    return res.json({
      success: true,

      data: {
        source:
          "Hyper Trade Internal Market",

        markets:
          getSignalMarketSnapshot(),
      },
    });
  }
);

router.get(
  "/cached",
  (_req, res) => {
    return res.json({
      success: true,

      data:
        getCachedSignals(),
    });
  }
);

router.get(
  "/candles/:symbol",
  (req, res) => {
    try {
      const symbol =
        normalizeSymbol(
          req.params.symbol
        );

      const timeframe =
        normalizeTimeframe(
          req.query.timeframe
        );

      const limit =
        Math.min(
          Math.max(
            Number(
              req.query.limit
            ) || 200,
            1
          ),
          1000
        );

      return res.json({
        success: true,

        data: {
          symbol,
          timeframe,

          source:
            "Hyper Trade Internal Market",

          candles:
            buildCandles(
              symbol,
              timeframe,
              limit
            ),
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

router.get(
  "/:symbol",
  (req, res) => {
    try {
      const symbol =
        normalizeSymbol(
          req.params.symbol
        );

      const timeframe =
        normalizeTimeframe(
          req.query.timeframe
        );

      return res.json({
        success: true,

        data: getSignal(
          symbol,
          timeframe
        ),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

module.exports = router;