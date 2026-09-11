const express = require("express");
const jwt = require("jsonwebtoken");

const prisma = require("../prisma");

const router = express.Router();

function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authorization.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = Number(
      decoded.userId ??
        decoded.id ??
        decoded.sub
    );

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.userId = userId;

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

async function requireSuperAdmin(req, res, next) {
  const user = await prisma.user.findUnique({
    where: {
      id: req.userId,
    },
    select: {
      id: true,
      role: true,
      email: true,
      fullName: true,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }

  req.adminUser = user;

  return next();
}

router.use(authenticate);
router.use(requireSuperAdmin);

router.get("/summary", async (_req, res) => {
  try {
    const accrued = await prisma.platformFeeLedger.groupBy({
      by: ["asset"],
      where: {
        status: "ACCRUED",
      },
      _sum: {
        amount: true,
      },
    });

    const settlements = await prisma.feeSettlement.groupBy({
      by: ["asset"],
      where: {
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    });

    const summary = {};

    for (const row of accrued) {
      summary[row.asset] = {
        accrued: String(row._sum.amount || 0),
        settled: "0",
        available: String(row._sum.amount || 0),
      };
    }

    for (const row of settlements) {
      if (!summary[row.asset]) {
        summary[row.asset] = {
          accrued: "0",
          settled: "0",
          available: "0",
        };
      }

      summary[row.asset].settled = String(
        row._sum.amount || 0
      );
    }

    for (const asset of Object.keys(summary)) {
      const accruedValue = Number(
        summary[asset].accrued
      );

      const settledValue = Number(
        summary[asset].settled
      );

      summary[asset].available = String(
        Math.max(
          0,
          accruedValue - settledValue
        )
      );
    }

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Fee summary error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/settlements", async (_req, res) => {
  try {
    const settlements =
      await prisma.feeSettlement.findMany({
        include: {
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      });

    return res.json({
      success: true,
      settlements,
    });
  } catch (error) {
    console.error("Fee settlements error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/settlements", async (req, res) => {
  try {
    const asset = String(
      req.body.asset || ""
    ).toUpperCase();

    const amount = Number(req.body.amount);

    const trackingNumber = String(
      req.body.trackingNumber || ""
    ).trim();

    const description = String(
      req.body.description || ""
    ).trim();

    if (
      ![
        "RIAL",
        "BTC",
        "ETH",
        "SOL",
        "TRX",
        "USDT",
      ].includes(asset)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Tracking number is required",
      });
    }

    const settings =
      await prisma.platformFeeSettings.findUnique({
        where: {
          id: 1,
        },
        include: {
          recipientAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (
      !settings ||
      !settings.recipientAdmin ||
      !["ADMIN", "SUPER_ADMIN"].includes(
        settings.recipientAdmin.role
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fee recipient is configured",
      });
    }

    const settlement =
      await prisma.feeSettlement.create({
        data: {
          adminId:
            settings.recipientAdmin.id,
          asset,
          amount: String(amount),
          bankName:
            settings.bankName || null,
          bankAccountNumber:
            settings.bankAccountNumber || null,
          bankIban:
            settings.bankIban || null,
          trackingNumber,
          description: description || null,
          status: "PAID",
        },
        include: {
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

    return res.status(201).json({
      success: true,
      settlement,
    });
  } catch (error) {
    console.error("Create fee settlement error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;