const express = require("express");
const crypto = require("crypto");

const bcrypt = require("bcryptjs");

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

function generateBase32Secret(length = 32) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  const bytes = crypto.randomBytes(length);

  let result = "";

  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[
      bytes[i] % alphabet.length
    ];
  }

  return result;
}

function base32ToBuffer(base32) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  const clean = String(base32)
    .replace(/=+$/, "")
    .toUpperCase();

  let bits = "";

  for (const char of clean) {
    const index = alphabet.indexOf(char);

    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }

    bits += index
      .toString(2)
      .padStart(5, "0");
  }

  const bytes = [];

  for (
    let i = 0;
    i + 8 <= bits.length;
    i += 8
  ) {
    bytes.push(
      parseInt(bits.slice(i, i + 8), 2)
    );
  }

  return Buffer.from(bytes);
}

function generateTotp(secret, timestamp = Date.now()) {
  const counter = Math.floor(
    timestamp / 1000 / 30
  );

  const buffer = Buffer.alloc(8);

  buffer.writeBigUInt64BE(
    BigInt(counter)
  );

  const key = base32ToBuffer(secret);

  const hmac = crypto
    .createHmac("sha1", key)
    .update(buffer)
    .digest();

  const offset =
    hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(
    6,
    "0"
  );
}

function verifyTotp(secret, token) {
  const code = String(token || "").trim();

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const now = Date.now();

  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTotp(
      secret,
      now + offset * 30000
    );

    if (expected === code) {
      return true;
    }
  }

  return false;
}

router.use(requireUser);

router.get("/2fa/status", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        twoFactorEnabled: true,
      },
    });

    return res.json({
      success: true,
      enabled: user
        ? user.twoFactorEnabled
        : false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/2fa/setup", async (req, res) => {
  try {
    const secret = generateBase32Secret();

    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    const issuer = "Hyper Trade";

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        email: true,
      },
    });

    const otpauth =
      `otpauth://totp/${encodeURIComponent(
        issuer
      )}:${encodeURIComponent(user.email)}` +
      `?secret=${secret}` +
      `&issuer=${encodeURIComponent(issuer)}` +
      `&algorithm=SHA1&digits=6&period=30`;

    return res.json({
      success: true,
      secret,
      otpauth,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/2fa/verify", async (req, res) => {
  try {
    const token = String(
      req.body.token || ""
    ).trim();

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        twoFactorSecret: true,
      },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: "2FA setup has not started",
      });
    }

    if (
      !verifyTotp(
        user.twoFactorSecret,
        token
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid 2FA code",
      });
    }

    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        twoFactorEnabled: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: "2FA_ENABLED",
      entity: "User",
      entityId: req.user.id,
      ipAddress: req.ip || null,
      userAgent:
        req.get("user-agent") || null,
    });

    return res.json({
      success: true,
      enabled: true,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/2fa/disable", async (req, res) => {
  try {
    const token = String(
      req.body.token || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        password: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    if (
      user.twoFactorEnabled &&
      (!user.twoFactorSecret ||
        !verifyTotp(
          user.twoFactorSecret,
          token
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid 2FA code",
      });
    }

    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: "2FA_DISABLED",
      entity: "User",
      entityId: req.user.id,
      ipAddress: req.ip || null,
      userAgent:
        req.get("user-agent") || null,
    });

    return res.json({
      success: true,
      enabled: false,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;