const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const prisma = require("../prisma");
const authenticateToken = require("../middlewares/auth.middleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const UPLOAD_DIR = path.join(
  __dirname,
  "../../uploads/support"
);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true,
  });
}

/*
|--------------------------------------------------------------------------
| Multer configuration
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const baseName = path
      .basename(
        file.originalname || "file",
        extension
      )
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${baseName}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",

      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",

      "application/pdf",
      "text/plain",

      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported file type. Allowed files include images, videos, PDF, TXT, Word and Excel documents."
        )
      );
    }

    return cb(null, true);
  },
});

/*
|--------------------------------------------------------------------------
| Authentication helpers
|--------------------------------------------------------------------------
*/

function getUserId(req) {
  const rawUserId =
    req.user?.id ??
    req.user?.userId ??
    req.user?.sub;

  const userId = Number(rawUserId);

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return null;
  }

  return userId;
}

async function getCurrentUser(req) {
  const userId = getUserId(req);

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isBlocked: true,
    },
  });
}

async function attachCurrentUser(
  req,
  res,
  next
) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "This account has been blocked.",
      });
    }

    req.currentUser = user;

    return next();
  } catch (error) {
    console.error(
      "Support current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify user account.",
    });
  }
}

function getRole(req) {
  return String(
    req.currentUser?.role ??
      req.user?.role ??
      ""
  ).toUpperCase();
}

function isAdminUser(req) {
  const role = getRole(req);

  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  );
}

function isSuperAdmin(req) {
  return (
    getRole(req) === "SUPER_ADMIN"
  );
}

function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (!isAdminUser(req)) {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  return next();
}

/*
|--------------------------------------------------------------------------
| Generic helpers
|--------------------------------------------------------------------------
*/

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStatus(value) {
  const status = normalizeText(value).toUpperCase();

  const allowed = [
    "OPEN",
    "IN_PROGRESS",
    "ANSWERED",
    "RESOLVED",
    "CLOSED",
  ];

  return allowed.includes(status)
    ? status
    : null;
}

function normalizePriority(value) {
  const priority =
    normalizeText(value).toUpperCase();

  const allowed = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
  ];

  return allowed.includes(priority)
    ? priority
    : null;
}

function cleanupUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  fs.unlink(file.path, () => {});
}

function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) {
    return;
  }

  for (const file of files) {
    cleanupUploadedFile(file);
  }
}

/*
|--------------------------------------------------------------------------
| Attachment storage
|--------------------------------------------------------------------------
|
| The current Prisma schema has no attachment columns in
| SupportMessage.
|
| Therefore attachment metadata is stored inside the
| existing SupportMessage.message field as JSON.
|
|--------------------------------------------------------------------------
*/

function buildStoredMessage({
  message,
  file,
}) {
  const cleanMessage = normalizeText(message);

  if (!file) {
    return cleanMessage;
  }

  const attachmentUrl =
    `/uploads/support/${file.filename}`;

  return JSON.stringify({
    text: cleanMessage,

    attachment: {
      type: file.mimetype,
      name: file.originalname,
      size: file.size,
      url: attachmentUrl,
    },
  });
}

function parseStoredMessage(value) {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return {
      text: "",
      attachment: null,
    };
  }

  try {
    const parsed = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === "object" &&
      (
        Object.prototype.hasOwnProperty.call(
          parsed,
          "text"
        ) ||
        Object.prototype.hasOwnProperty.call(
          parsed,
          "attachment"
        )
      )
    ) {
      return {
        text:
          typeof parsed.text === "string"
            ? parsed.text
            : "",

        attachment:
          parsed.attachment || null,
      };
    }
  } catch (_error) {
    // Existing legacy plain-text message.
  }

  return {
    text: value,
    attachment: null,
  };
}

/*
|--------------------------------------------------------------------------
| Serialization
|--------------------------------------------------------------------------
*/

function serializeMessage(message) {
  if (!message) {
    return null;
  }

  const parsed = parseStoredMessage(
    message.message
  );

  return {
    id:
      typeof message.id?.toString ===
      "function"
        ? message.id.toString()
        : message.id,

    ticketId: message.ticketId,

    senderId: message.senderId,

    senderType: message.senderType,

    message: parsed.text,

    attachment:
      parsed.attachment,

    attachmentUrl:
      parsed.attachment?.url ||
      null,

    attachmentType:
      parsed.attachment?.type ||
      null,

    attachmentName:
      parsed.attachment?.name ||
      null,

    attachmentSize:
      parsed.attachment?.size ||
      null,

    createdAt: message.createdAt,
  };
}

function serializeTicket(ticket) {
  const messages =
    Array.isArray(ticket?.messages)
      ? ticket.messages.map(
          serializeMessage
        )
      : [];

  return {
    id: ticket.id,

    userId: ticket.userId,

    subject: ticket.subject,

    category: ticket.category,

    priority: ticket.priority,

    status: ticket.status,

    assignedTo: ticket.assignedTo,

    createdAt: ticket.createdAt,

    updatedAt: ticket.updatedAt,

    closedAt: ticket.closedAt,

    user: ticket.user
      ? {
          id: ticket.user.id,
          fullName: ticket.user.fullName,
          email: ticket.user.email,
          role: ticket.user.role,
        }
      : null,

    messages,

    latestMessage:
      messages.length > 0
        ? messages[messages.length - 1]
        : null,
  };
}

/*
|--------------------------------------------------------------------------
| Prisma includes
|--------------------------------------------------------------------------
|
| IMPORTANT:
| The real SupportMessage model has NO "sender"
| relation. Therefore no sender include is used.
|--------------------------------------------------------------------------
*/

const ticketListInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },

  messages: {
    orderBy: {
      createdAt: "desc",
    },

    take: 1,
  },
};

const ticketDetailsInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },

  messages: {
    orderBy: {
      createdAt: "asc",
    },
  },
};

/*
|--------------------------------------------------------------------------
| Find ticket with access control
|--------------------------------------------------------------------------
*/

async function findTicketForRequest(
  req,
  ticketId
) {
  const numericTicketId =
    Number(ticketId);

  const userId = getUserId(req);

  if (
    !Number.isInteger(
      numericTicketId
    ) ||
    numericTicketId <= 0 ||
    !userId
  ) {
    return null;
  }

  const ticket =
    await prisma.supportTicket.findUnique({
      where: {
        id: numericTicketId,
      },

      include: ticketDetailsInclude,
    });

  if (!ticket) {
    return null;
  }

  if (
    !isAdminUser(req) &&
    ticket.userId !== userId
  ) {
    return null;
  }

  return ticket;
}

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

router.use(authenticateToken);
router.use(attachCurrentUser);

/*
|--------------------------------------------------------------------------
| GET /api/support/tickets
|--------------------------------------------------------------------------
*/

router.get(
  "/tickets",
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid authenticated user.",
        });
      }

      const requestedStatus =
        req.query.status;

      const normalizedStatus =
        requestedStatus
          ? normalizeStatus(
              requestedStatus
            )
          : null;

      if (
        requestedStatus &&
        !normalizedStatus
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket status.",
        });
      }

      const requestedPriority =
        req.query.priority;

      const normalizedPriority =
        requestedPriority
          ? normalizePriority(
              requestedPriority
            )
          : null;

      if (
        requestedPriority &&
        !normalizedPriority
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket priority.",
        });
      }

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 50,
          1
        ),
        100
      );

      const skip =
        (page - 1) * limit;

      const where = {};

      if (!isAdminUser(req)) {
        where.userId = userId;
      }

      if (normalizedStatus) {
        where.status =
          normalizedStatus;
      }

      if (normalizedPriority) {
        where.priority =
          normalizedPriority;
      }

      if (req.query.category) {
        where.category =
          normalizeText(
            req.query.category
          ).toUpperCase();
      }

      if (
        typeof req.query.search ===
          "string" &&
        req.query.search.trim()
      ) {
        const search =
          req.query.search.trim();

        if (isAdminUser(req)) {
          where.OR = [
            {
              subject: {
                contains: search,
                mode: "insensitive",
              },
            },

            {
              user: {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },

            {
              user: {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ];
        } else {
          where.subject = {
            contains: search,
            mode: "insensitive",
          };
        }
      }

      const [
        tickets,
        total,
      ] = await prisma.$transaction([
        prisma.supportTicket.findMany({
          where,

          orderBy: {
            updatedAt: "desc",
          },

          skip,
          take: limit,

          include:
            ticketListInclude,
        }),

        prisma.supportTicket.count({
          where,
        }),
      ]);

      return res.json({
        success: true,

        data: {
          tickets:
            tickets.map(
              serializeTicket
            ),

          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(
                total / limit
              ),
          },
        },
      });
    } catch (error) {
      console.error(
        "GET /api/support/tickets error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load support tickets.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/support/tickets/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/tickets/:id",
  async (req, res) => {
    try {
      const ticket =
        await findTicketForRequest(
          req,
          req.params.id
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      return res.json({
        success: true,
        data: serializeTicket(ticket),
      });
    } catch (error) {
      console.error(
        "GET /api/support/tickets/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load ticket.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/support/tickets
|--------------------------------------------------------------------------
*/

router.post(
  "/tickets",
  upload.single("file"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(401).json({
          success: false,
          message:
            "Invalid authenticated user.",
        });
      }

      const subject =
        normalizeText(
          req.body.subject
        );

      const message =
        normalizeText(
          req.body.message ??
            req.body.body
        );

      if (!subject) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(400).json({
          success: false,
          message:
            "Subject is required.",
        });
      }

      if (
        subject.length > 200
      ) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(400).json({
          success: false,
          message:
            "Subject must be 200 characters or less.",
        });
      }

      if (
        !message &&
        !req.file
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Message or attachment is required.",
        });
      }

      if (
        message.length > 10000
      ) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(400).json({
          success: false,
          message:
            "Message must be 10,000 characters or less.",
        });
      }

      const category =
        normalizeText(
          req.body.category
        ).toUpperCase() ||
        "GENERAL";

      const priority =
        normalizePriority(
          req.body.priority
        ) || "NORMAL";

      const storedMessage =
        buildStoredMessage({
          message,
          file: req.file,
        });

      const ticket =
        await prisma.supportTicket.create({
          data: {
            userId,

            subject,

            category,

            priority,

            status: "OPEN",

            messages: {
              create: {
                senderId: userId,

                senderType: "USER",

                message:
                  storedMessage,
              },
            },
          },

          include:
            ticketDetailsInclude,
        });

      return res.status(201).json({
        success: true,
        message:
          "Support ticket created successfully.",
        data: serializeTicket(ticket),
      });
    } catch (error) {
      cleanupUploadedFile(
        req.file
      );

      console.error(
        "POST /api/support/tickets error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to create support ticket.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/support/tickets/:id/messages
|--------------------------------------------------------------------------
*/

router.post(
  "/tickets/:id/messages",
  upload.single("file"),
  async (req, res) => {
    try {
      const ticket =
        await findTicketForRequest(
          req,
          req.params.id
        );

      if (!ticket) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const message =
        normalizeText(
          req.body.message ??
            req.body.body
        );

      if (
        !message &&
        !req.file
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Message or attachment is required.",
        });
      }

      if (
        message.length > 10000
      ) {
        cleanupUploadedFile(
          req.file
        );

        return res.status(400).json({
          success: false,
          message:
            "Message must be 10,000 characters or less.",
        });
      }

      const userId =
        getUserId(req);

      const adminReply =
        isAdminUser(req);

      const storedMessage =
        buildStoredMessage({
          message,
          file: req.file,
        });

      let nextStatus;

      if (adminReply) {
        nextStatus = "ANSWERED";
      } else if (
        [
          "ANSWERED",
          "RESOLVED",
          "CLOSED",
        ].includes(ticket.status)
      ) {
        nextStatus = "OPEN";
      } else {
        nextStatus =
          ticket.status;
      }

      const updatedTicket =
        await prisma.$transaction(
          async (tx) => {
            await tx.supportMessage.create(
              {
                data: {
                  ticketId:
                    ticket.id,

                  senderId: userId,

                  senderType:
                    adminReply
                      ? getRole(req)
                      : "USER",

                  message:
                    storedMessage,
                },
              }
            );

            return tx.supportTicket.update(
              {
                where: {
                  id: ticket.id,
                },

                data: {
                  status: nextStatus,

                  closedAt:
                    nextStatus ===
                    "CLOSED"
                      ? ticket.closedAt ||
                        new Date()
                      : null,
                },

                include:
                  ticketDetailsInclude,
              }
            );
          }
        );

      return res.status(201).json({
        success: true,
        message:
          "Support message sent successfully.",
        data: serializeTicket(
          updatedTicket
        ),
      });
    } catch (error) {
      cleanupUploadedFile(
        req.file
      );

      console.error(
        "POST /api/support/tickets/:id/messages error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to send support message.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/support/tickets/:id
|--------------------------------------------------------------------------
|
| ADMIN / SUPER_ADMIN
|
|--------------------------------------------------------------------------
*/

router.patch(
  "/tickets/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const ticketId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          ticketId
        ) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket ID.",
        });
      }

      const existing =
        await prisma.supportTicket.findUnique(
          {
            where: {
              id: ticketId,
            },
          }
        );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const data = {};

      if (
        req.body.status !==
        undefined
      ) {
        const status =
          normalizeStatus(
            req.body.status
          );

        if (!status) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid ticket status.",
          });
        }

        data.status = status;

        data.closedAt =
          status === "CLOSED"
            ? existing.closedAt ||
              new Date()
            : null;
      }

      if (
        req.body.priority !==
        undefined
      ) {
        const priority =
          normalizePriority(
            req.body.priority
          );

        if (!priority) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid ticket priority.",
          });
        }

        data.priority =
          priority;
      }

      if (
        req.body.category !==
        undefined
      ) {
        const category =
          normalizeText(
            req.body.category
          ).toUpperCase();

        data.category =
          category || "GENERAL";
      }

      if (
        req.body.assignedTo !==
        undefined
      ) {
        if (
          req.body.assignedTo ===
            null ||
          req.body.assignedTo ===
            ""
        ) {
          data.assignedTo = null;
        } else {
          const assignedTo =
            Number(
              req.body.assignedTo
            );

          if (
            !Number.isInteger(
              assignedTo
            ) ||
            assignedTo <= 0
          ) {
            return res.status(
              400
            ).json({
              success: false,
              message:
                "Invalid assigned admin ID.",
            });
          }

          const admin =
            await prisma.user.findUnique(
              {
                where: {
                  id: assignedTo,
                },

                select: {
                  id: true,
                  role: true,
                  isBlocked: true,
                },
              }
            );

          if (
            !admin ||
            ![
              "ADMIN",
              "SUPER_ADMIN",
            ].includes(
              admin.role
            ) ||
            admin.isBlocked
          ) {
            return res.status(
              400
            ).json({
              success: false,
              message:
                "Ticket can only be assigned to an active admin.",
            });
          }

          data.assignedTo =
            assignedTo;
        }
      }

      if (
        Object.keys(data)
          .length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No ticket changes were provided.",
        });
      }

      const updated =
        await prisma.supportTicket.update(
          {
            where: {
              id: ticketId,
            },

            data,

            include:
              ticketDetailsInclude,
          }
        );

      return res.json({
        success: true,
        message:
          "Ticket updated successfully.",
        data: serializeTicket(
          updated
        ),
      });
    } catch (error) {
      console.error(
        "PATCH /api/support/tickets/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to update ticket.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/support/tickets/:id/status
|--------------------------------------------------------------------------
*/

router.patch(
  "/tickets/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      const ticketId =
        Number(req.params.id);

      const status =
        normalizeStatus(
          req.body?.status
        );

      if (
        !Number.isInteger(
          ticketId
        ) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket ID.",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket status.",
        });
      }

      const existing =
        await prisma.supportTicket.findUnique(
          {
            where: {
              id: ticketId,
            },
          }
        );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const updated =
        await prisma.supportTicket.update(
          {
            where: {
              id: ticketId,
            },

            data: {
              status,

              closedAt:
                status === "CLOSED"
                  ? existing.closedAt ||
                    new Date()
                  : null,
            },

            include:
              ticketDetailsInclude,
          }
        );

      return res.json({
        success: true,
        message:
          "Ticket status updated successfully.",
        data: serializeTicket(
          updated
        ),
      });
    } catch (error) {
      console.error(
        "PATCH /api/support/tickets/:id/status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to update ticket status.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/support/tickets/:id/assign
|--------------------------------------------------------------------------
*/

router.post(
  "/tickets/:id/assign",
  requireAdmin,
  async (req, res) => {
    try {
      const ticketId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          ticketId
        ) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket ID.",
        });
      }

      const existing =
        await prisma.supportTicket.findUnique(
          {
            where: {
              id: ticketId,
            },
          }
        );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      const rawAdminId =
        req.body?.adminId ??
        req.body?.assignedTo;

      if (
        rawAdminId ===
          null ||
        rawAdminId ===
          "" ||
        rawAdminId ===
          undefined
      ) {
        const updated =
          await prisma.supportTicket.update(
            {
              where: {
                id: ticketId,
              },

              data: {
                assignedTo: null,
              },

              include:
                ticketDetailsInclude,
            }
          );

        return res.json({
          success: true,
          message:
            "Ticket assignment removed.",
          data:
            serializeTicket(
              updated
            ),
        });
      }

      const adminId =
        Number(rawAdminId);

      if (
        !Number.isInteger(
          adminId
        ) ||
        adminId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admin ID.",
        });
      }

      const admin =
        await prisma.user.findUnique(
          {
            where: {
              id: adminId,
            },

            select: {
              id: true,
              role: true,
              isBlocked: true,
            },
          }
        );

      if (
        !admin ||
        ![
          "ADMIN",
          "SUPER_ADMIN",
        ].includes(
          admin.role
        ) ||
        admin.isBlocked
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ticket can only be assigned to an active admin.",
        });
      }

      const updated =
        await prisma.supportTicket.update(
          {
            where: {
              id: ticketId,
            },

            data: {
              assignedTo:
                adminId,
            },

            include:
              ticketDetailsInclude,
          }
        );

      return res.json({
        success: true,
        message:
          "Ticket assigned successfully.",
        data: serializeTicket(
          updated
        ),
      });
    } catch (error) {
      console.error(
        "POST /api/support/tickets/:id/assign error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to assign ticket.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/support/admin/stats
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/stats",
  requireAdmin,
  async (_req, res) => {
    try {
      const [
        total,
        open,
        inProgress,
        answered,
        resolved,
        closed,
      ] = await Promise.all([
        prisma.supportTicket.count(),

        prisma.supportTicket.count({
          where: {
            status: "OPEN",
          },
        }),

        prisma.supportTicket.count({
          where: {
            status:
              "IN_PROGRESS",
          },
        }),

        prisma.supportTicket.count({
          where: {
            status: "ANSWERED",
          },
        }),

        prisma.supportTicket.count({
          where: {
            status: "RESOLVED",
          },
        }),

        prisma.supportTicket.count({
          where: {
            status: "CLOSED",
          },
        }),
      ]);

      return res.json({
        success: true,

        data: {
          total,
          open,
          inProgress,
          answered,
          resolved,
          closed,
        },
      });
    } catch (error) {
      console.error(
        "GET /api/support/admin/stats error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load support statistics.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/support/admin/users
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/users",
  requireAdmin,
  async (_req, res) => {
    try {
      const admins =
        await prisma.user.findMany({
          where: {
            role: {
              in: [
                "ADMIN",
                "SUPER_ADMIN",
              ],
            },

            isBlocked: false,
          },

          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },

          orderBy: {
            fullName: "asc",
          },
        });

      return res.json({
        success: true,
        data: admins,
      });
    } catch (error) {
      console.error(
        "GET /api/support/admin/users error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to load support admins.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/support/tickets/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/tickets/:id",
  async (req, res) => {
    try {
      const ticketId =
        Number(req.params.id);

      const userId =
        getUserId(req);

      if (
        !Number.isInteger(
          ticketId
        ) ||
        ticketId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid ticket ID.",
        });
      }

      const ticket =
        await prisma.supportTicket.findUnique(
          {
            where: {
              id: ticketId,
            },

            include: {
              messages: true,
            },
          }
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found.",
        });
      }

      if (
        !isAdminUser(req) &&
        ticket.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this ticket.",
        });
      }

      const attachments = [];

      for (
        const message of ticket.messages
      ) {
        const parsed =
          parseStoredMessage(
            message.message
          );

        if (
          parsed.attachment?.url
        ) {
          attachments.push(
            parsed.attachment.url
          );
        }
      }

      await prisma.supportTicket.delete(
        {
          where: {
            id: ticketId,
          },
        }
      );

      for (
        const attachmentUrl of attachments
      ) {
        if (
          typeof attachmentUrl !==
            "string" ||
          !attachmentUrl.startsWith(
            "/uploads/support/"
          )
        ) {
          continue;
        }

        const fileName =
          path.basename(
            attachmentUrl
          );

        if (!fileName) {
          continue;
        }

        fs.unlink(
          path.join(
            UPLOAD_DIR,
            fileName
          ),
          () => {}
        );
      }

      return res.json({
        success: true,
        message:
          "Ticket deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/support/tickets/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to delete ticket.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Multer / route error handler
|--------------------------------------------------------------------------
*/

router.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      "Support route error:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "File is too large. Maximum size is 50 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Support request failed.",
    });
  }
);

module.exports = router;