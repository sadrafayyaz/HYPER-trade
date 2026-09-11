const express = require("express");

const prisma = require("../prisma");

const {
  createAuditLog,
} = require("../services/audit.service");

const router = express.Router();

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  next();
}

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        nationalCode: true,
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycRejectedAt: true,
        kycRejectionReason: true,
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
      kyc: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const nationalCode = String(
      req.body.nationalCode || ""
    ).trim();

    if (!/^[0-9]{10}$/.test(nationalCode)) {
      return res.status(400).json({
        success: false,
        message:
          "National code must contain exactly 10 digits",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        kycStatus: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.kycStatus === "VERIFIED") {
      return res.status(400).json({
        success: false,
        message: "KYC is already verified",
      });
    }

    const updated = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        nationalCode,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        kycRejectedAt: null,
        kycRejectionReason: null,
      },
      select: {
        id: true,
        nationalCode: true,
        kycStatus: true,
        kycSubmittedAt: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: "KYC_SUBMITTED",
      entity: "User",
      entityId: req.user.id,
      ipAddress: req.ip || null,
      userAgent:
        req.get("user-agent") || null,
      metadata: {
        kycStatus: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      message: "KYC submitted successfully",
      kyc: updated,
    });
  } catch (error) {
    console.error("KYC submit error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;