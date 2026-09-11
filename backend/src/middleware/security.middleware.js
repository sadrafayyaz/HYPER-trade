const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many authentication attempts.",
  },
});

const tradingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many trading requests.",
  },
});

const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many wallet requests.",
  },
});

function validateProductionEnvironment() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters in production"
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_INTERNAL_WALLET === "true"
  ) {
    throw new Error(
      "ENABLE_INTERNAL_WALLET must be false in production"
    );
  }
}

module.exports = {
  generalLimiter,
  authLimiter,
  tradingLimiter,
  walletLimiter,
  validateProductionEnvironment,
};