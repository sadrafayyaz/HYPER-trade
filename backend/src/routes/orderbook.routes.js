const express = require("express");

const authenticateToken =
  require(
    "../middlewares/auth.middleware"
  );

const {
  getOrderBook,
  getTimeAndSales,
} = require(
  "../services/orderbook.service"
);

const router =
  express.Router();

router.use(
  authenticateToken
);

router.get(
  "/:symbol/trades",
  async (req, res) => {
    try {
      const data =
        await getTimeAndSales(
          req.params.symbol,
          req.query.limit
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "GET /api/orderbook/:symbol/trades error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to load trade feed.",
      });
    }
  }
);

router.get(
  "/:symbol",
  async (req, res) => {
    try {
      const data =
        await getOrderBook(
          req.params.symbol,
          req.query.limit
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "GET /api/orderbook/:symbol error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to load order book.",
      });
    }
  }
);

module.exports = router;