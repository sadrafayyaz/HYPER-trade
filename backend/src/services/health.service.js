const prisma = require("../prisma");

async function getSystemHealth() {
  const startedAt = Date.now();

  let database = {
    status: "down",
    latencyMs: null,
  };

  try {
    const dbStart = Date.now();

    await prisma.$queryRaw`SELECT 1`;

    database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    database = {
      status: "down",
      latencyMs: null,
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    };
  }

  const healthy =
    database.status === "up";

  return {
    healthy,
    database,
    uptimeSeconds: Math.floor(
      process.uptime()
    ),
    responseTimeMs: Date.now() - startedAt,
    environment:
      process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getSystemHealth,
};