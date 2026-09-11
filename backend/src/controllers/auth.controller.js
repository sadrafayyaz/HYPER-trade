// backend/src/controllers/auth.controller.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../prisma");

/* =========================================================
   CONFIG
========================================================= */

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  "sadrafayyaz1390";

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN ||
  "7d";

const SALT_ROUNDS = 12;

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function normalizePhone(value) {
  const phone = cleanString(value);

  return phone || null;
}

function normalizeNationalCode(value) {
  const code = cleanString(value);

  return code || null;
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    isBlocked: user.isBlocked,
    nationalCode: user.nationalCode,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function getUserIdFromRequest(req) {
  const value =
    req?.user?.userId ??
    req?.user?.id;

  const userId = Number(value);

  return Number.isInteger(userId) &&
    userId > 0
    ? userId
    : null;
}

/* =========================================================
   REGISTER
========================================================= */

async function register(req, res) {
  try {
    const body = req.body || {};

    const fullName =
      cleanString(body.fullName);

    const email =
      normalizeEmail(body.email);

    const phone =
      normalizePhone(body.phone);

    const password =
      cleanString(body.password);

    const nationalCode =
      normalizeNationalCode(
        body.nationalCode
      );

    /* =========================
       VALIDATION
    ========================= */

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    if (fullName.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Full name must contain at least 2 characters.",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });
    }

    /* =========================
       CHECK EXISTING USER
    ========================= */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /* =========================
       CHECK PHONE
    ========================= */

    if (phone) {
      const existingPhone =
        await prisma.user.findUnique({
          where: {
            phone,
          },
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this phone number already exists.",
        });
      }
    }

    /* =========================
       PASSWORD HASH
    ========================= */

    const hashedPassword =
      await bcrypt.hash(
        password,
        SALT_ROUNDS
      );

    /* =========================
       CREATE USER + WALLET
    ========================= */

    const result =
      await prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                fullName,
                email,
                phone,
                password:
                  hashedPassword,
                nationalCode,
                role: "USER",
                emailVerified:
                  false,
                phoneVerified:
                  false,
                isBlocked: false,
              },
            });

          const wallet =
            await tx.wallet.create({
              data: {
                userId: user.id,
                rialBalance: 0,
                btcBalance: 0,
                ethBalance: 0,
                solBalance: 0,
                usdtBalance: 0,
              },
            });

          return {
            user,
            wallet,
          };
        }
      );

    /* =========================
       TOKEN
    ========================= */

    const token =
      createToken(result.user);

    /* =========================
       RESPONSE
    ========================= */

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      data: {
        user: publicUser(
          result.user
        ),
        wallet: {
          id: result.wallet.id,
          userId:
            result.wallet.userId,
          rialBalance:
            result.wallet.rialBalance.toString(),
          btcBalance:
            result.wallet.btcBalance.toString(),
          ethBalance:
            result.wallet.ethBalance.toString(),
          solBalance:
            result.wallet.solBalance.toString(),
          usdtBalance:
            result.wallet.usdtBalance.toString(),
        },
        token,
      },
    });
  } catch (error) {
    console.error(
      "========== REGISTER ERROR =========="
    );

    console.error(error);

    console.error(
      "===================================="
    );

    /* =========================
       PRISMA UNIQUE ERROR
    ========================= */

    if (
      error?.code === "P2002"
    ) {
      const target =
        error?.meta?.target;

      if (
        Array.isArray(target) &&
        target.includes("email")
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Email is already registered.",
        });
      }

      if (
        Array.isArray(target) &&
        target.includes("phone")
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Phone number is already registered.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "An account with these details already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/* =========================================================
   LOGIN
========================================================= */

async function login(req, res) {
  try {
    const body = req.body || {};

    const identifier =
      cleanString(
        body.email ??
          body.identifier ??
          body.username
      ).toLowerCase();

    const password =
      cleanString(body.password);

    /* =========================
       VALIDATION
    ========================= */

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required.",
      });
    }

    /* =========================
       FIND USER
    ========================= */

    let user =
      await prisma.user.findUnique({
        where: {
          email: identifier,
        },
        include: {
          wallet: true,
        },
      });

    /*
      The current schema uses email as the
      login identifier. Phone login is also
      supported when the supplied identifier
      is not an email.
    */

    if (!user && identifier) {
      user =
        await prisma.user.findUnique({
          where: {
            phone: identifier,
          },
          include: {
            wallet: true,
          },
        });
    }

    /* =========================
       USER NOT FOUND
    ========================= */

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =========================
       BLOCKED USER
    ========================= */

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked.",
      });
    }

    /* =========================
       PASSWORD
    ========================= */

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =========================
       UPDATE LOGIN
    ========================= */

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLogin:
            new Date(),
        },
        include: {
          wallet: true,
        },
      });

    /* =========================
       TOKEN
    ========================= */

    const token =
      createToken(updatedUser);

    /* =========================
       WALLET
    ========================= */

    const wallet =
      updatedUser.wallet;

    /* =========================
       RESPONSE
    ========================= */

    return res.status(200).json({
      success: true,
      message:
        "Login successful.",
      data: {
        user: publicUser(
          updatedUser
        ),

        wallet: wallet
          ? {
              id: wallet.id,
              userId:
                wallet.userId,
              rialBalance:
                wallet.rialBalance.toString(),
              btcBalance:
                wallet.btcBalance.toString(),
              ethBalance:
                wallet.ethBalance.toString(),
              solBalance:
                wallet.solBalance.toString(),
              usdtBalance:
                wallet.usdtBalance.toString(),
            }
          : null,

        token,
      },
    });
  } catch (error) {
    console.error(
      "========== LOGIN ERROR =========="
    );

    console.error(error);

    console.error(
      "================================="
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/* =========================================================
   GET CURRENT USER
========================================================= */

async function me(req, res) {
  try {
    const userId =
      getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          wallet: true,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: publicUser(user),

        wallet: user.wallet
          ? {
              id:
                user.wallet.id,
              userId:
                user.wallet.userId,
              rialBalance:
                user.wallet.rialBalance.toString(),
              btcBalance:
                user.wallet.btcBalance.toString(),
              ethBalance:
                user.wallet.ethBalance.toString(),
              solBalance:
                user.wallet.solBalance.toString(),
              usdtBalance:
                user.wallet.usdtBalance.toString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "========== ME ERROR =========="
    );

    console.error(error);

    console.error(
      "=============================="
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load user.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/* =========================================================
   VERIFY TOKEN
========================================================= */

async function verifyToken(req, res) {
  try {
    const userId =
      getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication.",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isBlocked: true,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User not found.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Account is blocked.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Token is valid.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "========== VERIFY TOKEN ERROR =========="
    );

    console.error(error);

    console.error(
      "========================================"
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify token.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  register,
  login,
  me,
  verifyToken,
};