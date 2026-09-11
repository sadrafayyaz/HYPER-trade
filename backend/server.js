require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const path = require("path");

const prisma =
  require("./src/prisma");

const authRoutes =
  require("./src/routes/auth.routes");

const dashboardRoutes =
  require(
    "./src/routes/dashboard.routes"
  );

const marketRoutes =
  require("./src/routes/market.routes");

const orderRoutes =
  require("./src/routes/order.routes");

const walletRoutes =
  require("./src/routes/wallet.routes");

const adminRoutes =
  require("./src/routes/admin.routes");

const kycRoutes =
  require("./src/routes/kyc.routes");

const securityRoutes =
  require("./src/routes/security.routes");

const supportRoutes =
  require("./src/routes/support.routes");

const signalRoutes =
  require("./src/routes/signal.routes");

const orderbookRoutes =
  require(
    "./src/routes/orderbook.routes"
  );

const {
  startMarketSocket,
  stopMarketSocket,
} = require(
  "./src/services/market.socket"
);

const {
  startLimitOrderMatcher,
  stopLimitOrderMatcher,
} = require(
  "./src/services/limit-order.matcher"
);

const {
  startInternalMarketEngine,
  stopInternalMarketEngine,
} = require(
  "./src/services/internal-market.engine"
);

const {
  generalLimiter,
  authLimiter,
  tradingLimiter,
  walletLimiter,
  validateProductionEnvironment,
} = require(
  "./src/middleware/security.middleware"
);

const {
  notFoundHandler,
  errorHandler,
} = require(
  "./src/middleware/error.middleware"
);

const {
  getSystemHealth,
} = require(
  "./src/services/health.service"
);

/* =========================================================
   ENVIRONMENT VALIDATION
========================================================= */

validateProductionEnvironment();

/* =========================================================
   EXPRESS APPLICATION
========================================================= */

const app =
  express();

const server =
  http.createServer(
    app
  );

/* =========================================================
   BASIC SECURITY
========================================================= */

app.disable(
  "x-powered-by"
);

app.set(
  "trust proxy",
  1
);

app.use(
  helmet({
    contentSecurityPolicy:
      false,

    crossOriginEmbedderPolicy:
      false,
  })
);

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
            .split(",")
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean)
        : true,

    credentials:
      true,
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(
  express.json({
    limit:
      "1mb",
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      "1mb",
  })
);

/* =========================================================
   GENERAL RATE LIMITER
========================================================= */

app.use(
  generalLimiter
);

/* =========================================================
   STATIC SUPPORT UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  async (_req, res) => {
    try {
      const health =
        await getSystemHealth();

      return res
        .status(
          health.healthy
            ? 200
            : 503
        )
        .json({
          success:
            health.healthy,

          message:
            "Hyper Trade API",

          ...health,

          tradingFee:
            "0.5%",
        });
    } catch (error) {
      console.error(
        "Health check error:",
        error
      );

      return res
        .status(503)
        .json({
          success:
            false,

          message:
            "Hyper Trade API",

          healthy:
            false,
        });
    }
  }
);

/* =========================================================
   READINESS CHECK
========================================================= */

app.get(
  "/api/ready",
  async (_req, res) => {
    try {
      await prisma.$queryRaw`
        SELECT 1
      `;

      return res.json({
        success:
          true,

        ready:
          true,
      });
    } catch (error) {
      console.error(
        "Readiness check error:",
        error
      );

      return res
        .status(503)
        .json({
          success:
            false,

          ready:
            false,
        });
    }
  }
);

/* =========================================================
   API ROUTES
========================================================= */

app.use(
  "/api/auth",
  authLimiter,
  authRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/market",
  marketRoutes
);

app.use(
  "/api/orders",
  tradingLimiter,
  orderRoutes
);

app.use(
  "/api/wallet",
  walletLimiter,
  walletRoutes
);

app.use(
  "/api/kyc",
  kycRoutes
);

app.use(
  "/api/security",
  securityRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/support",
  supportRoutes
);

app.use(
  "/api/signals",
  signalRoutes
);

app.use(
  "/api/orderbook",
  orderbookRoutes
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use(
  notFoundHandler
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  errorHandler
);

/* =========================================================
   SERVER PORT
========================================================= */

const PORT =
  Number(
    process.env.PORT
  ) || 3000;

/* =========================================================
   SERVER START
========================================================= */

async function startServer() {
  try {
    await prisma.$connect();

    console.log(
      "✅ Database connected"
    );

    server.listen(
      PORT,
      () => {
        console.log(
          `🚀 Hyper Trade API running on http://localhost:${PORT}`
        );

        startInternalMarketEngine();

        console.log(
          "📈 Hyper Trade Internal Market Engine started"
        );

        startMarketSocket(
          server
        );

        console.log(
          `📡 Hyper Trade Market WebSocket running on ws://localhost:${PORT}/ws/market`
        );

        startLimitOrderMatcher();

        console.log(
          "⚙️ Hyper Trade Limit Order Matcher started"
        );

        console.log(
          "🛡️ Hyper Trade Production Security enabled"
        );

        console.log(
          "💬 Hyper Trade Support API enabled"
        );

        console.log(
          "📁 Hyper Trade Support Uploads enabled at /uploads"
        );

        console.log(
          "📊 Hyper Trade Internal Signal API enabled at /api/signals"
        );

        console.log(
          "📚 Hyper Trade Internal Order Book API enabled at /api/orderbook"
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Failed to start Hyper Trade server"
    );

    console.error(
      error
    );

    try {
      await prisma.$disconnect();
    } catch (
      disconnectError
    ) {
      console.error(
        "❌ Database disconnect error:",
        disconnectError.message
      );
    }

    process.exit(
      1
    );
  }
}

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

let shuttingDown =
  false;

async function shutdown(
  signal
) {
  if (
    shuttingDown
  ) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    `\n🛑 ${signal}: shutting down Hyper Trade...`
  );

  try {
    stopLimitOrderMatcher();

    stopInternalMarketEngine();

    stopMarketSocket();

    await new Promise(
      (resolve) => {
        server.close(
          () => resolve()
        );
      }
    );

    await prisma.$disconnect();

    console.log(
      "✅ Hyper Trade server stopped."
    );

    process.exit(
      0
    );
  } catch (error) {
    console.error(
      "❌ Shutdown error:",
      error.message
    );

    process.exit(
      1
    );
  }
}

/* =========================================================
   PROCESS SIGNALS
========================================================= */

process.once(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT"
    )
);

process.once(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM"
    )
);

/* =========================================================
   UNHANDLED REJECTION
========================================================= */

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "❌ Unhandled Promise Rejection:",
      reason
    );
  }
);

/* =========================================================
   UNCAUGHT EXCEPTION
========================================================= */

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );

    shutdown(
      "uncaughtException"
    );
  }
);

/* =========================================================
   START
========================================================= */

startServer();