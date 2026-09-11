const prisma = require("../prisma");

async function createAuditLog({
  userId = null,
  adminId = null,
  action,
  entity,
  entityId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      adminId,
      action,
      entity,
      entityId:
        entityId === null || entityId === undefined
          ? null
          : String(entityId),
      ipAddress,
      userAgent,
      metadata,
    },
  });
}

async function getAuditLogs(options = {}) {
  const limit = Math.min(
    Math.max(Number(options.limit) || 50, 1),
    200
  );

  const skip = Math.max(Number(options.skip) || 0, 0);

  const where = {};

  if (options.userId) {
    where.userId = Number(options.userId);
  }

  if (options.action) {
    where.action = String(options.action);
  }

  if (options.entity) {
    where.entity = String(options.entity);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({
      where,
    }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id.toString(),
      userId: log.userId,
      adminId: log.adminId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    })),
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + logs.length < total,
    },
  };
}

module.exports = {
  createAuditLog,
  getAuditLogs,
};