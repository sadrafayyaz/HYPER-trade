const express = require("express");
const jwt = require("jsonwebtoken");

const {
  TRADING_FEE_RATE,
  SUPPORTED_SYMBOLS,
  executeMarketOrder,
  createLimitOrder,
  cancelOrder,
  getUserOrders,
  getOrderById,
} = require("../services/order.service");

const router = express.Router();

function authenticate(req, res, next) {
  try {
    const authorization =
      req.headers.authorization || "";

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const token =
      authorization.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = Number(
      decoded.userId ??
        decoded.id ??
        decoded.sub
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }

    req.userId = userId;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token.",
    });
  }
}

router.get(
  "/config",
  (_req, res) => {
    return res.json({
      success: true,
      tradingFee:
        TRADING_FEE_RATE.toString(),
      tradingFeePercent: 0.5,
      symbols:
        Object.keys(
          SUPPORTED_SYMBOLS
        ),
      sides: [
        "BUY",
        "SELL",
      ],
      types: [
        "MARKET",
        "LIMIT",
      ],
    });
  }
);

router.get(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const orders =
        await getUserOrders(
          req.userId,
          {
            symbol:
              req.query.symbol,
            status:
              req.query.status,
            limit:
              req.query.limit,
          }
        );

      return res.json({
        success: true,
        data: Array.isArray(
          orders
        )
          ? orders
          : [],
      });
    } catch (error) {
      console.error(
        "GET /api/orders error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to load orders.",
        data: [],
      });
    }
  }
);

router.get(
  "/:id",
  authenticate,
  async (req, res) => {
    try {
      const orderId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(
          orderId
        ) ||
        orderId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID.",
        });
      }

      const order =
        await getOrderById(
          req.userId,
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error(
        "GET /api/orders/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to load order.",
      });
    }
  }
);

router.post(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const {
        symbol,
        side,
        type,
        amount,
        price,
      } = req.body;

      const normalizedSymbol =
        String(symbol || "")
          .trim()
          .toUpperCase()
          .replace(/-/g, "/");

      const normalizedSide =
        String(side || "")
          .trim()
          .toUpperCase();

      const normalizedType =
        String(type || "")
          .trim()
          .toUpperCase();

      const numericAmount =
        Number(amount);

      const numericPrice =
        Number(price);

      if (!normalizedSymbol) {
        return res.status(400).json({
          success: false,
          message:
            "Trading symbol is required.",
        });
      }

      if (
        !SUPPORTED_SYMBOLS[
          normalizedSymbol
        ]
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported trading pair.",
        });
      }

      if (
        ![
          "BUY",
          "SELL",
        ].includes(
          normalizedSide
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Side must be BUY or SELL.",
        });
      }

      if (
        ![
          "MARKET",
          "LIMIT",
        ].includes(
          normalizedType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Type must be MARKET or LIMIT.",
        });
      }

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be greater than zero.",
        });
      }

      if (
        normalizedType === "LIMIT" &&
        (
          !Number.isFinite(
            numericPrice
          ) ||
          numericPrice <= 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid limit price is required.",
        });
      }

      let result;

      if (
        normalizedType ===
        "MARKET"
      ) {
        result =
          await executeMarketOrder({
            userId:
              req.userId,
            symbol:
              normalizedSymbol,
            side:
              normalizedSide,
            amount:
              numericAmount,
          });
      } else {
        result =
          await createLimitOrder({
            userId:
              req.userId,
            symbol:
              normalizedSymbol,
            side:
              normalizedSide,
            amount:
              numericAmount,
            price:
              numericPrice,
          });
      }

      return res.status(201).json({
        success: true,
        message:
          normalizedType ===
          "MARKET"
            ? "Market order executed successfully."
            : "Limit order created successfully.",
        data: result,
      });
    } catch (error) {
      console.error(
        "POST /api/orders error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to create order.",
      });
    }
  }
);

router.post(
  "/:id/cancel",
  authenticate,
  async (req, res) => {
    try {
      const orderId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          orderId
        ) ||
        orderId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID.",
        });
      }

      const order =
        await cancelOrder({
          userId:
            req.userId,
          orderId,
        });

      return res.json({
        success: true,
        message:
          "Order cancelled successfully.",
        data: order,
      });
    } catch (error) {
      console.error(
        "POST /api/orders/:id/cancel error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to cancel order.",
      });
    }
  }
);

module.exports = router;