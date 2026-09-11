require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const prisma = require("./src/prisma");

const authRoutes = require("./src/routes/auth.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const marketRoutes = require("./src/routes/market.routes");
const orderRoutes = require("./src/routes/order.routes");

const {
  startMarketSocket,
  stopMarketSocket,
} = require("./src/services/market.socket");

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.get("/api/health", async (_req, res) => {
  let database = "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (error) {
    database = "disconnected";
  }

  return res.json({
    success: database === "connected",
    message: "Hyper Trade API is running.",
    database,
    tradingFee: "0.5%",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/market", marketRoutes);

/*
 * IMPORTANT:
 * The correct file name is:
 *
 * src/routes/order.routes.js
 *
 * NOT orders.routes.js
 */
app.use("/api/orders", orderRoutes);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error("❌ Hyper Trade API error:");

  if (error?.stack) {
    console.error(error.stack);
  } else {
    console.error(error);
  }

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error?.status || 500).json({
    success: false,
    message:
      error?.message ||
      "Internal server error.",
  });
});

/*
|--------------------------------------------------------------------------
| Server
|--------------------------------------------------------------------------
*/

const PORT = Number(
  process.env.PORT || 3000
);

let serverStarted = false;
let shuttingDown = false;

async function startServer() {
  try {
    console.log("⏳ Connecting to PostgreSQL...");

    await prisma.$connect();

    console.log("✅ Database connected");

    server.listen(PORT, () => {
      serverStarted = true;

      console.log(
        `🚀 Hyper Trade API running on http://localhost:${PORT}`
      );

      try {
        startMarketSocket(server);

        console.log(
          `📡 Hyper Trade Market WebSocket running on ws://localhost:${PORT}/ws/market`
        );
      } catch (socketError) {
        console.error(
          "❌ Failed to start Market WebSocket:",
          socketError
        );
      }
    });

    server.on("error", async (error) => {
      console.error("❌ HTTP server error:", error);

      if (error.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${PORT} is already in use.`
        );

        await shutdown("SERVER_ERROR");
      }
    });
  } catch (error) {
    console.error(
      "❌ Failed to start Hyper Trade server"
    );

    console.error(error);

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        "❌ Failed to disconnect database:",
        disconnectError.message
      );
    }

    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `\n🛑 ${signal}: shutting down Hyper Trade...`
  );

  try {
    try {
      stopMarketSocket();
      console.log(
        "📡 Market WebSocket stopped."
      );
    } catch (socketError) {
      console.error(
        "❌ WebSocket shutdown error:",
        socketError.message
      );
    }

    try {
      await prisma.$disconnect();
      console.log(
        "✅ Database disconnected."
      );
    } catch (databaseError) {
      console.error(
        "❌ Database shutdown error:",
        databaseError.message
      );
    }

    if (!serverStarted) {
      process.exit(0);
      return;
    }

    server.close((error) => {
      if (error) {
        console.error(
          "❌ HTTP server shutdown error:",
          error.message
        );

        process.exit(1);
        return;
      }

      console.log(
        "✅ Hyper Trade server stopped."
      );

      process.exit(0);
    });

    setTimeout(() => {
      console.error(
        "⚠️ Forced shutdown."
      );

      process.exit(1);
    }, 10000).unref();
  } catch (error) {
    console.error(
      "❌ Shutdown error:",
      error.message
    );

    process.exit(1);
  }
}

process.once("SIGINT", () => {
  shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  shutdown("SIGTERM");
});

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

startServer();