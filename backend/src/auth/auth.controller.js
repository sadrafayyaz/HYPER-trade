const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

/* =========================
   REGISTER
========================= */

async function register(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      nationalCode,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      phone && phone.trim()
        ? phone.trim()
        : null;

    /* Check existing account */

    const existingEmail =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    if (normalizedPhone) {
      const existingPhone =
        await prisma.user.findUnique({
          where: {
            phone: normalizedPhone,
          },
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this phone already exists.",
        });
      }
    }

    /* Hash password */

    const hashedPassword =
      await bcrypt.hash(password, 12);

    /* Create user */

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        nationalCode:
          nationalCode &&
          nationalCode.trim()
            ? nationalCode.trim()
            : null,
      },
    });

    /* Create wallet */

    await prisma.wallet.create({
      data: {
        userId: user.id,
      },
    });

    console.log(
      `✅ New user registered: ${user.email}`
    );

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
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

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}


/* =========================
   LOGIN
========================= */

async function login(req, res) {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

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

    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET is missing from .env"
      );

      return res.status(500).json({
        success: false,
        message:
          "Authentication configuration error.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN ||
          "7d",
      }
    );

    console.log(
      `🔐 User logged in: ${user.email}`
    );

    return res.status(200).json({
      success: true,
      message:
        "Login successful.",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
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
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}


/* =========================
   EXPORT
========================= */

module.exports = {
  register,
  login,
};