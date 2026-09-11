const express = require("express");

const prisma = require("../prisma");
const authenticateToken = require("../middlewares/auth.middleware");

const {
  createAuditLog,
  getAuditLogs,
} = require("../services/audit.service");

const {
  getUserRisk,
} = require("../services/risk.service");

const router = express.Router();

/* =========================================================
   ADMIN AUTH MIDDLEWARE
========================================================= */

function getAuthenticatedUserId(req) {
  const rawId =
    req.user?.userId ??
    req.user?.id ??
    req.user?.sub;

  const userId =
    Number(rawId);

  return Number.isInteger(
    userId
  ) && userId > 0
    ? userId
    : null;
}

async function requireAdmin(
  req,
  res,
  next
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

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
          isBlocked: true,
          emailVerified: true,
          phoneVerified: true,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated user not found",
      });
    }

    const email =
      String(
        user.email || ""
      ).trim().toLowerCase();

    const role =
      String(
        user.role || ""
      ).trim().toUpperCase();

    const configuredSuperAdmin =
      email ===
      "sadrafayyaz9@gmail.com";

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "This account has been blocked",
      });
    }

    if (
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN" &&
      !configuredSuperAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required",
      });
    }

    req.currentAdmin = user;
    req.adminUserId = user.id;
    req.adminRole =
      configuredSuperAdmin
        ? "SUPER_ADMIN"
        : role;

    /* Keep existing handlers compatible. */
    req.user.id =
      user.id;
    req.user.role =
      configuredSuperAdmin
        ? "SUPER_ADMIN"
        : role;

    next();
  } catch (error) {
    console.error(
      "Admin authentication error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Unable to authenticate admin",
    });
  }
}

function requireSuperAdmin(
  req,
  res,
  next
) {
  if (
    !req.currentAdmin ||
    !req.adminUserId
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required",
    });
  }

  if (
    req.adminRole !==
    "SUPER_ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Super admin access required",
    });
  }

  next();
}

router.use(
  authenticateToken
);

router.get(
  "/me",
  async (req, res) => {
    try {
      const userId =
        getAuthenticatedUserId(
          req
        );

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

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
            isBlocked: true,
            emailVerified: true,
            phoneVerified: true,
            kycStatus: true,
            riskScore: true,
            riskLevel: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      const email =
        String(
          user.email || ""
        ).trim().toLowerCase();

      const role =
        String(
          user.role || ""
        ).trim().toUpperCase();

      const configuredSuperAdmin =
        email ===
        "sadrafayyaz9@gmail.com";

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message:
            "This account has been blocked",
        });
      }

      if (
        role !== "ADMIN" &&
        role !== "SUPER_ADMIN" &&
        !configuredSuperAdmin
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access required",
        });
      }

      return res.json({
        success: true,
        user: {
          ...user,
          role:
            configuredSuperAdmin
              ? "SUPER_ADMIN"
              : role,
        },
      });
    } catch (error) {
      console.error(
        "Admin identity error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to load admin identity",
      });
    }
  }
);

router.use(
  requireAdmin
);

/* =========================================================
   USERS
========================================================= */

router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      200
    );

    const skip = Math.max(
      Number(req.query.skip) || 0,
      0
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const where = search
      ? {
          OR: [
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              fullName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          isBlocked: true,
          kycStatus: true,
          riskScore: true,
          riskLevel: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.user.count({
        where,
      }),
    ]);

    return res.json({
      success: true,
      users,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================================================
   USER DETAILS
========================================================= */

router.get("/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await prisma.user.findUnique({
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
        nationalCode: true,
        isBlocked: true,
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycRejectedAt: true,
        kycRejectionReason: true,
        riskScore: true,
        riskLevel: true,
        lastRiskCheckAt: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        wallet: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Admin user details error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================================================
   BLOCK / UNBLOCK USER
========================================================= */

router.patch("/users/:id/block", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const blocked = req.body.blocked === true;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isBlocked: blocked,
      },
      select: {
        id: true,
        email: true,
        isBlocked: true,
      },
    });

    await createAuditLog({
      adminId: req.user.id,
      userId,
      action: blocked
        ? "USER_BLOCKED"
        : "USER_UNBLOCKED",
      entity: "User",
      entityId: userId,
      ipAddress: req.ip || null,
      userAgent:
        req.get("user-agent") || null,
      metadata: {
        blocked,
      },
    });

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Admin block error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================================================
   KYC
========================================================= */

router.patch(
  "/users/:id/kyc",
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id",
        });
      }

      const status = String(
        req.body.status || ""
      ).toUpperCase();

      const allowed = [
        "NOT_SUBMITTED",
        "PENDING",
        "VERIFIED",
        "REJECTED",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid KYC status",
        });
      }

      const rejectionReason =
        status === "REJECTED"
          ? String(
              req.body.rejectionReason || ""
            ).trim()
          : null;

      if (
        status === "REJECTED" &&
        !rejectionReason
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason is required",
        });
      }

      const now = new Date();

      const data = {
        kycStatus: status,
      };

      if (status === "PENDING") {
        data.kycSubmittedAt = now;
        data.kycVerifiedAt = null;
        data.kycRejectedAt = null;
        data.kycRejectionReason = null;
      }

      if (status === "VERIFIED") {
        data.kycVerifiedAt = now;
        data.kycRejectedAt = null;
        data.kycRejectionReason = null;
      }

      if (status === "REJECTED") {
        data.kycRejectedAt = now;
        data.kycVerifiedAt = null;
        data.kycRejectionReason =
          rejectionReason;
      }

      if (status === "NOT_SUBMITTED") {
        data.kycSubmittedAt = null;
        data.kycVerifiedAt = null;
        data.kycRejectedAt = null;
        data.kycRejectionReason = null;
      }

      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data,
        select: {
          id: true,
          email: true,
          kycStatus: true,
          kycSubmittedAt: true,
          kycVerifiedAt: true,
          kycRejectedAt: true,
          kycRejectionReason: true,
        },
      });

      await createAuditLog({
        adminId: req.user.id,
        userId,
        action: "KYC_STATUS_CHANGED",
        entity: "User",
        entityId: userId,
        ipAddress: req.ip || null,
        userAgent:
          req.get("user-agent") || null,
        metadata: {
          status,
          rejectionReason,
        },
      });

      return res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Admin KYC error:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =========================================================
   USER RISK
========================================================= */

router.get(
  "/users/:id/risk",
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id",
        });
      }

      const risk = await getUserRisk(userId);

      return res.json({
        success: true,
        ...risk,
      });
    } catch (error) {
      console.error("Admin risk error:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =========================================================
   AUDIT LOGS
========================================================= */

router.get("/audit-logs", async (req, res) => {
  try {
    const result = await getAuditLogs({
      userId: req.query.userId,
      action: req.query.action,
      entity: req.query.entity,
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Admin audit logs error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================================================
   ADMIN STATS
========================================================= */

router.get("/stats", async (_req, res) => {
  try {
    const [
      users,
      blockedUsers,
      verifiedKyc,
      pendingKyc,
      highRisk,
      criticalRisk,
      completedOrders,
      pendingOrders,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          isBlocked: true,
        },
      }),

      prisma.user.count({
        where: {
          kycStatus: "VERIFIED",
        },
      }),

      prisma.user.count({
        where: {
          kycStatus: "PENDING",
        },
      }),

      prisma.user.count({
        where: {
          riskLevel: "HIGH",
        },
      }),

      prisma.user.count({
        where: {
          riskLevel: "CRITICAL",
        },
      }),

      prisma.order.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),
    ]);

    return res.json({
      success: true,
      stats: {
        users,
        blockedUsers,
        verifiedKyc,
        pendingKyc,
        highRisk,
        criticalRisk,
        completedOrders,
        pendingOrders,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================================================
   CHANGE USER ROLE
   SUPER ADMIN ONLY
========================================================= */

router.patch(
  "/users/:id/role",
  requireSuperAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);

      const role = String(
        req.body.role || ""
      ).toUpperCase();

      if (
        !Number.isInteger(userId) ||
        ![
          "USER",
          "ADMIN",
          "SUPER_ADMIN",
        ].includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id or role",
        });
      }

      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          role,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      await createAuditLog({
        adminId: req.user.id,
        userId,
        action: "USER_ROLE_CHANGED",
        entity: "User",
        entityId: userId,
        ipAddress: req.ip || null,
        userAgent:
          req.get("user-agent") || null,
        metadata: {
          role,
        },
      });

      return res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Admin role error:", error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;