const express = require("express");

const authenticateToken = require(
  "../middlewares/auth.middleware"
);

const prisma = require("../prisma");

const router = express.Router();

/* =========================
   GET DASHBOARD
========================= */

router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = Number(
        req.user?.userId
      );

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid user authentication.",
        });
      }

      /* =========================
         USER + WALLET + ORDERS
      ========================= */

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            emailVerified: true,
            phoneVerified: true,
            isBlocked: true,
            lastLogin: true,
            nationalCode: true,
            createdAt: true,
            updatedAt: true,

            wallet: {
              select: {
                id: true,
                userId: true,
                rialBalance: true,
                btcBalance: true,
                ethBalance: true,
                solBalance: true,
                usdtBalance: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            orders: {
              orderBy: {
                createdAt: "desc",
              },

              take: 20,

              select: {
                id: true,
                symbol: true,
                side: true,
                amount: true,
                price: true,
                fee: true,
                total: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

      /* =========================
         USER NOT FOUND
      ========================= */

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      /* =========================
         BLOCKED USER
      ========================= */

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message:
            "This account has been blocked.",
        });
      }

      /* =========================
         WALLET DEFAULT
      ========================= */

      const wallet =
        user.wallet || {
          id: null,
          userId: user.id,
          rialBalance: "0",
          btcBalance: "0",
          ethBalance: "0",
          solBalance: "0",
          usdtBalance: "0",
          createdAt: null,
          updatedAt: null,
        };

      /* =========================
         RESPONSE
      ========================= */

      return res.status(200).json({
        success: true,

        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            emailVerified:
              user.emailVerified,
            phoneVerified:
              user.phoneVerified,
            isBlocked: user.isBlocked,
            lastLogin: user.lastLogin,
            nationalCode:
              user.nationalCode,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },

          wallet: {
            id: wallet.id,
            userId: wallet.userId,
            rialBalance:
              wallet.rialBalance?.toString() ||
              "0",
            btcBalance:
              wallet.btcBalance?.toString() ||
              "0",
            ethBalance:
              wallet.ethBalance?.toString() ||
              "0",
            solBalance:
              wallet.solBalance?.toString() ||
              "0",
            usdtBalance:
              wallet.usdtBalance?.toString() ||
              "0",
            createdAt:
              wallet.createdAt,
            updatedAt:
              wallet.updatedAt,
          },

          orders:
            user.orders.map((order) => ({
              id: order.id,
              symbol: order.symbol,
              side: order.side,
              amount:
                order.amount?.toString() ||
                "0",
              price:
                order.price?.toString() ||
                "0",
              fee:
                order.fee?.toString() ||
                "0",
              total:
                order.total?.toString() ||
                "0",
              status: order.status,
              createdAt:
                order.createdAt,
              updatedAt:
                order.updatedAt,
            })),
        },
      });
    } catch (error) {
      console.error(
        "========== DASHBOARD ERROR =========="
      );

      console.error(error);

      console.error(
        "====================================="
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load dashboard.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  }
);

module.exports = router;