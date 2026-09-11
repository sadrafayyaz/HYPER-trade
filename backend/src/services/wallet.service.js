const prisma = require("../prisma");

const { Prisma } = require("@prisma/client");

const ASSETS = {
  RIAL: {
    balanceField: "rialBalance",
    reservedField: "reservedRialBalance",
    scale: 2,
  },
  BTC: {
    balanceField: "btcBalance",
    reservedField: "reservedBtcBalance",
    scale: 12,
  },
  ETH: {
    balanceField: "ethBalance",
    reservedField: "reservedEthBalance",
    scale: 12,
  },
  SOL: {
    balanceField: "solBalance",
    reservedField: "reservedSolBalance",
    scale: 12,
  },
  TRX: {
    balanceField: "trxBalance",
    reservedField: "reservedTrxBalance",
    scale: 12,
  },
  USDT: {
    balanceField: "usdtBalance",
    reservedField: "reservedUsdtBalance",
    scale: 8,
  },
};

function normalizeAsset(asset) {
  return String(asset || "").trim().toUpperCase();
}

function getAssetConfig(asset) {
  const normalized = normalizeAsset(asset);

  if (!ASSETS[normalized]) {
    throw new Error(`Unsupported asset: ${normalized}`);
  }

  return {
    asset: normalized,
    ...ASSETS[normalized],
  };
}

function toDecimal(value) {
  try {
    return new Prisma.Decimal(String(value));
  } catch (_) {
    throw new Error("Invalid amount");
  }
}

function validatePositiveAmount(value) {
  const amount = toDecimal(value);

  if (!amount.isFinite() || amount.lte(0)) {
    throw new Error("Amount must be greater than zero");
  }

  return amount;
}

function generateReference(prefix, userId) {
  return `${prefix}-${userId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

async function ensureWallet(tx, userId) {
  return tx.wallet.upsert({
    where: {
      userId,
    },
    create: {
      userId,
    },
    update: {},
  });
}

async function getWallet(userId) {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId,
    },
  });

  if (!wallet) {
    return prisma.wallet.create({
      data: {
        userId,
      },
    });
  }

  return wallet;
}

async function getWalletSummary(userId) {
  const wallet = await getWallet(userId);

  return {
    id: wallet.id,
    userId: wallet.userId,

    balances: {
      RIAL: wallet.rialBalance.toString(),
      BTC: wallet.btcBalance.toString(),
      ETH: wallet.ethBalance.toString(),
      SOL: wallet.solBalance.toString(),
      TRX: wallet.trxBalance.toString(),
      USDT: wallet.usdtBalance.toString(),
    },

    reserved: {
      RIAL: wallet.reservedRialBalance.toString(),
      BTC: wallet.reservedBtcBalance.toString(),
      ETH: wallet.reservedEthBalance.toString(),
      SOL: wallet.reservedSolBalance.toString(),
      TRX: wallet.reservedTrxBalance.toString(),
      USDT: wallet.reservedUsdtBalance.toString(),
    },

    available: {
      RIAL: wallet.rialBalance
        .sub(wallet.reservedRialBalance)
        .toString(),

      BTC: wallet.btcBalance
        .sub(wallet.reservedBtcBalance)
        .toString(),

      ETH: wallet.ethBalance
        .sub(wallet.reservedEthBalance)
        .toString(),

      SOL: wallet.solBalance
        .sub(wallet.reservedSolBalance)
        .toString(),

      TRX: wallet.trxBalance
        .sub(wallet.reservedTrxBalance)
        .toString(),

      USDT: wallet.usdtBalance
        .sub(wallet.reservedUsdtBalance)
        .toString(),
    },

    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

async function createInternalDeposit(userId, asset, rawAmount, description) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Internal deposits are disabled in production");
  }

  if (process.env.ENABLE_INTERNAL_WALLET !== "true") {
    throw new Error("Internal wallet is disabled");
  }

  const config = getAssetConfig(asset);
  const amount = validatePositiveAmount(rawAmount);

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(tx, userId);

    const newBalance = wallet[config.balanceField].add(amount);

    const updatedWallet = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        [config.balanceField]: newBalance,
      },
    });

    const reference = generateReference("DEP", userId);

    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        userId,
        asset: config.asset,
        entryType: "DEPOSIT",
        amount,
        balanceAfter: newBalance,
        reference,
        description:
          description || `Internal ${config.asset} deposit`,
      },
    });

    return {
      wallet: updatedWallet,
      ledgerEntry,
    };
  });
}

async function withdraw(userId, asset, rawAmount, description) {
  if (process.env.ENABLE_BLOCKCHAIN_WITHDRAW !== "true") {
    throw new Error("Blockchain withdrawals are currently disabled");
  }

  const config = getAssetConfig(asset);
  const amount = validatePositiveAmount(rawAmount);

  return prisma.$transaction(
    async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      const available = wallet[config.balanceField].sub(
        wallet[config.reservedField]
      );

      if (available.lt(amount)) {
        throw new Error(`Insufficient available ${config.asset} balance`);
      }

      const newBalance = wallet[config.balanceField].sub(amount);

      const updatedWallet = await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          [config.balanceField]: newBalance,
        },
      });

      const reference = generateReference("WDR", userId);

      const ledgerEntry = await tx.walletLedgerEntry.create({
        data: {
          userId,
          asset: config.asset,
          entryType: "WITHDRAWAL",
          amount: amount.neg(),
          balanceAfter: newBalance,
          reference,
          description:
            description || `${config.asset} withdrawal`,
        },
      });

      return {
        wallet: updatedWallet,
        ledgerEntry,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

async function getLedger(userId, options = {}) {
  const limit = Math.min(
    Math.max(Number(options.limit) || 50, 1),
    200
  );

  const skip = Math.max(Number(options.skip) || 0, 0);

  const where = {
    userId,
  };

  if (options.asset) {
    const config = getAssetConfig(options.asset);
    where.asset = config.asset;
  }

  if (options.entryType) {
    const entryType = String(options.entryType)
      .trim()
      .toUpperCase();

    const allowedTypes = [
      "DEPOSIT",
      "WITHDRAWAL",
      "TRADE_DEBIT",
      "TRADE_CREDIT",
      "FEE",
      "REFUND",
      "RESERVATION",
      "RELEASE",
      "ADJUSTMENT",
    ];

    if (!allowedTypes.includes(entryType)) {
      throw new Error("Invalid ledger entry type");
    }

    where.entryType = entryType;
  }

  const [entries, total] = await Promise.all([
    prisma.walletLedgerEntry.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.walletLedgerEntry.count({
      where,
    }),
  ]);

  return {
    entries: entries.map((entry) => ({
      id: entry.id.toString(),
      userId: entry.userId,
      orderId: entry.orderId,
      asset: entry.asset,
      entryType: entry.entryType,
      amount: entry.amount.toString(),
      balanceAfter: entry.balanceAfter.toString(),
      reference: entry.reference,
      description: entry.description,
      createdAt: entry.createdAt,
    })),
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + entries.length < total,
    },
  };
}

async function getAssetBalance(userId, asset) {
  const config = getAssetConfig(asset);
  const wallet = await getWallet(userId);

  const balance = wallet[config.balanceField];
  const reserved = wallet[config.reservedField];
  const available = balance.sub(reserved);

  return {
    asset: config.asset,
    balance: balance.toString(),
    reserved: reserved.toString(),
    available: available.toString(),
  };
}

module.exports = {
  ASSETS,
  getWallet,
  getWalletSummary,
  getAssetBalance,
  createInternalDeposit,
  withdraw,
  getLedger,
};