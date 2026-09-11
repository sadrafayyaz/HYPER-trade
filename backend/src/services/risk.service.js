const { Prisma } = require("@prisma/client");

const prisma = require("../prisma");

function calculateRiskLevel(score) {
  if (score >= 80) {
    return "CRITICAL";
  }

  if (score >= 50) {
    return "HIGH";
  }

  if (score >= 25) {
    return "MEDIUM";
  }

  return "LOW";
}

async function addRiskEvent({
  userId,
  type,
  severity,
  score,
  reason,
  metadata = null,
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const newScore = Math.min(
      Math.max(user.riskScore + Number(score), 0),
      100
    );

    const riskLevel = calculateRiskLevel(newScore);

    const event = await tx.riskEvent.create({
      data: {
        userId,
        type,
        severity,
        score: Number(score),
        reason,
        metadata,
      },
    });

    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        riskScore: newScore,
        riskLevel,
        lastRiskCheckAt: new Date(),
      },
    });

    return event;
  });
}

async function getUserRisk(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      riskScore: true,
      riskLevel: true,
      lastRiskCheckAt: true,
      isBlocked: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const events = await prisma.riskEvent.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return {
    user,
    events: events.map((event) => ({
      id: event.id.toString(),
      type: event.type,
      severity: event.severity,
      score: event.score,
      reason: event.reason,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
  };
}

async function blockIfCritical(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      riskScore: true,
      riskLevel: true,
      isBlocked: true,
    },
  });

  if (!user) {
    return false;
  }

  if (
    user.riskLevel === "CRITICAL" &&
    !user.isBlocked
  ) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isBlocked: true,
      },
    });

    return true;
  }

  return false;
}

async function evaluateLargeWithdrawal(
  userId,
  amount
) {
  const value = new Prisma.Decimal(String(amount));

  if (value.gte(100000000)) {
    await addRiskEvent({
      userId,
      type: "LARGE_WITHDRAWAL",
      severity: "HIGH",
      score: 35,
      reason: "Large withdrawal detected",
      metadata: {
        amount: value.toString(),
      },
    });

    await blockIfCritical(userId);

    return true;
  }

  if (value.gte(50000000)) {
    await addRiskEvent({
      userId,
      type: "LARGE_WITHDRAWAL",
      severity: "MEDIUM",
      score: 15,
      reason: "Medium-large withdrawal detected",
      metadata: {
        amount: value.toString(),
      },
    });

    return true;
  }

  return false;
}

module.exports = {
  calculateRiskLevel,
  addRiskEvent,
  getUserRisk,
  blockIfCritical,
  evaluateLargeWithdrawal,
};