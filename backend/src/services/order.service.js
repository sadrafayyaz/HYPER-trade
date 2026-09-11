const prisma = require("../prisma");
const { Prisma } = require("@prisma/client");
const { getPrice: getInternalMarketPrice } = require('./internal-market.engine');

const TRADING_FEE_RATE =
  new Prisma.Decimal("0.005");

const ZERO =
  new Prisma.Decimal("0");

const SUPPORTED_SYMBOLS = {
  "BTC/USDT": {
    base: "BTC",
    quote: "USDT",
  },

  "ETH/USDT": {
    base: "ETH",
    quote: "USDT",
  },

  "SOL/USDT": {
    base: "SOL",
    quote: "USDT",
  },

  "TRX/USDT": {
    base: "TRX",
    quote: "USDT",
  },
};

const BALANCE_FIELDS = {
  RIAL: "rialBalance",
  BTC: "btcBalance",
  ETH: "ethBalance",
  SOL: "solBalance",
  TRX: "trxBalance",
  USDT: "usdtBalance",
};

const RESERVED_FIELDS = {
  RIAL: "rialReserved",
  BTC: "btcReserved",
  ETH: "ethReserved",
  SOL: "solReserved",
  TRX: "trxReserved",
  USDT: "usdtReserved",
};

function toDecimal(value) {
  try {
    return new Prisma.Decimal(
      String(value)
    );
  } catch (error) {
    throw new Error(
      "Invalid decimal value."
    );
  }
}

function positiveDecimal(
  value,
  fieldName
) {
  const result =
    toDecimal(value);

  if (
    !result.isFinite() ||
    result.lte(ZERO)
  ) {
    throw new Error(
      `${fieldName} must be greater than zero.`
    );
  }

  return result;
}

function nonNegative(value) {
  const result =
    toDecimal(value);

  return result.lt(ZERO)
    ? ZERO
    : result;
}

function normalizeSymbol(symbol) {
  const normalized =
    String(symbol || "")
      .trim()
      .toUpperCase()
      .replace(/-/g, "/");

  if (
    !SUPPORTED_SYMBOLS[
      normalized
    ]
  ) {
    throw new Error(
      "Unsupported trading pair."
    );
  }

  return normalized;
}

function normalizeSide(side) {
  const normalized =
    String(side || "")
      .trim()
      .toUpperCase();

  if (
    ![
      "BUY",
      "SELL",
    ].includes(
      normalized
    )
  ) {
    throw new Error(
      "Invalid order side."
    );
  }

  return normalized;
}

function getBalanceField(asset) {
  const field =
    BALANCE_FIELDS[asset];

  if (!field) {
    throw new Error(
      `Unsupported asset: ${asset}`
    );
  }

  return field;
}

function getReservedField(asset) {
  const field =
    RESERVED_FIELDS[asset];

  if (!field) {
    throw new Error(
      `Unsupported asset: ${asset}`
    );
  }

  return field;
}

function calculateGross(
  amount,
  price
) {
  return amount.mul(price);
}

function calculateFee(gross) {
  return gross.mul(
    TRADING_FEE_RATE
  );
}

async function getMarketPrice(
  symbol
) {
  const normalizedSymbol =
    normalizeSymbol(
      symbol
    );

  const pair =
    SUPPORTED_SYMBOLS[
      normalizedSymbol
    ];

  const internalPrice =
    getInternalMarketPrice(
      normalizedSymbol
    );

  if (
    Number.isFinite(
      Number(
        internalPrice
      )
    ) &&
    Number(
      internalPrice
    ) > 0
  ) {
    return positiveDecimal(
      internalPrice,
      "internal market price"
    );
  }

  /*
   * Legacy external market-price fallback.
   * Disabled by default.
   *
   * Enable only for controlled diagnostics:
   * ALLOW_EXTERNAL_MARKET_SOURCE=true
   */
  if (
    process.env.ALLOW_EXTERNAL_MARKET_SOURCE !==
    "true"
  ) {
    throw new Error(
      "Internal market price is unavailable."
    );
  }

  const ids = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    TRX: "tron",
  };

  const coinId =
    ids[pair.base];

  if (!coinId) {
    throw new Error(
      "Market price source is unavailable."
    );
  }

  const response =
    await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );

  if (!response.ok) {
    throw new Error(
      "Unable to fetch market price."
    );
  }

  const data =
    await response.json();

  const price =
    data?.[coinId]?.usd;

  return positiveDecimal(
    price,
    "market price"
  );
}

async function getWalletForUpdate(
  tx,
  userId
) {
  const wallet =
    await tx.wallet.findUnique({
      where: {
        userId,
      },
    });

  if (!wallet) {
    throw new Error(
      "Wallet not found."
    );
  }

  return wallet;
}

async function createLedgerEntry(
  tx,
  {
    userId,
    orderId = null,
    asset,
    entryType,
    amount,
    balanceAfter,
    reference,
    description,
  }
) {
  return tx.walletLedgerEntry.create({
    data: {
      userId,
      orderId,
      asset,
      entryType,
      amount:
        toDecimal(
          amount
        ).toString(),
      balanceAfter:
        toDecimal(
          balanceAfter
        ).toString(),
      reference,
      description,
    },
  });
}

async function createPlatformFeeEntry(
  tx,
  {
    orderId,
    asset,
    amount,
    reference,
  }
) {
  return tx.platformFeeLedger.create({
    data: {
      orderId,
      asset,
      amount:
        toDecimal(
          amount
        ).toString(),
      status:
        "ACCRUED",
      ownerLabel:
        "HYPER TRADE",
      reference,
    },
  });
}

async function createTradeLedgers(
  tx,
  {
    userId,
    order,
    pair,
    side,
    amount,
    gross,
    fee,
    baseBalance,
    quoteBalance,
  }
) {
  const reference =
    `ORDER-${order.id}`;

  if (
    side === "BUY"
  ) {
    await createLedgerEntry(
      tx,
      {
        userId,
        orderId:
          order.id,
        asset:
          pair.quote,
        entryType:
          "TRADE_DEBIT",
        amount:
          gross.neg(),
        balanceAfter:
          quoteBalance.add(
            fee
          ),
        reference,
        description:
          `BUY ${amount.toString()} ${pair.base}`,
      }
    );

    await createLedgerEntry(
      tx,
      {
        userId,
        orderId:
          order.id,
        asset:
          pair.base,
        entryType:
          "TRADE_CREDIT",
        amount,
        balanceAfter:
          baseBalance,
        reference,
        description:
          `BUY ${amount.toString()} ${pair.base}`,
      }
    );
  } else {
    await createLedgerEntry(
      tx,
      {
        userId,
        orderId:
          order.id,
        asset:
          pair.base,
        entryType:
          "TRADE_DEBIT",
        amount:
          amount.neg(),
        balanceAfter:
          baseBalance,
        reference,
        description:
          `SELL ${amount.toString()} ${pair.base}`,
      }
    );

    await createLedgerEntry(
      tx,
      {
        userId,
        orderId:
          order.id,
        asset:
          pair.quote,
        entryType:
          "TRADE_CREDIT",
        amount:
          gross,
        balanceAfter:
          quoteBalance.sub(
            fee
          ),
        reference,
        description:
          `SELL ${amount.toString()} ${pair.base}`,
      }
    );
  }

  await createLedgerEntry(
    tx,
    {
      userId,
      orderId:
        order.id,
      asset:
        pair.quote,
      entryType:
        "FEE",
      amount:
        fee.neg(),
      balanceAfter:
        quoteBalance,
      reference:
        `FEE-${order.id}`,
      description:
        "Hyper Trade trading fee",
    }
  );
}

async function executeMarketOrder({
  userId,
  symbol,
  side,
  amount,
}) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const normalizedSide =
    normalizeSide(side);

  const normalizedAmount =
    positiveDecimal(
      amount,
      "amount"
    );

  const pair =
    SUPPORTED_SYMBOLS[
      normalizedSymbol
    ];

  const price =
    await getMarketPrice(
      normalizedSymbol
    );

  return prisma.$transaction(
    async (tx) => {
      const wallet =
        await getWalletForUpdate(
          tx,
          userId
        );

      const baseField =
        getBalanceField(
          pair.base
        );

      const quoteField =
        getBalanceField(
          pair.quote
        );

      let baseBalance =
        toDecimal(
          wallet[baseField]
        );

      let quoteBalance =
        toDecimal(
          wallet[quoteField]
        );

      const gross =
        calculateGross(
          normalizedAmount,
          price
        );

      const fee =
        calculateFee(
          gross
        );

      const total =
        gross.add(fee);

      if (
        normalizedSide ===
        "BUY"
      ) {
        if (
          quoteBalance.lt(
            total
          )
        ) {
          throw new Error(
            `Insufficient ${pair.quote} balance.`
          );
        }

        quoteBalance =
          quoteBalance.sub(
            total
          );

        baseBalance =
          baseBalance.add(
            normalizedAmount
          );
      } else {
        if (
          baseBalance.lt(
            normalizedAmount
          )
        ) {
          throw new Error(
            `Insufficient ${pair.base} balance.`
          );
        }

        baseBalance =
          baseBalance.sub(
            normalizedAmount
          );

        quoteBalance =
          quoteBalance.add(
            gross.sub(fee)
          );
      }

      const order =
        await tx.order.create({
          data: {
            userId,
            symbol:
              normalizedSymbol,
            side:
              normalizedSide,
            type:
              "MARKET",
            amount:
              normalizedAmount.toString(),
            price:
              price.toString(),
            fee:
              fee.toString(),
            total:
              total.toString(),
            status:
              "COMPLETED",
            filledAmount:
              normalizedAmount.toString(),
            executedAt:
              new Date(),
          },
        });

      await tx.wallet.update({
        where: {
          userId,
        },
        data: {
          [baseField]:
            baseBalance.toString(),
          [quoteField]:
            quoteBalance.toString(),
        },
      });

      await createTradeLedgers(
        tx,
        {
          userId,
          order,
          pair,
          side:
            normalizedSide,
          amount:
            normalizedAmount,
          gross,
          fee,
          baseBalance,
          quoteBalance,
        }
      );

      await createPlatformFeeEntry(
        tx,
        {
          orderId:
            order.id,
          asset:
            pair.quote,
          amount:
            fee,
          reference:
            `PLATFORM-FEE-${order.id}`,
        }
      );

      return {
        order,
        wallet: {
          ...wallet,
          [baseField]:
            baseBalance,
          [quoteField]:
            quoteBalance,
        },
        marketPrice:
          price.toString(),
        gross:
          gross.toString(),
        fee:
          fee.toString(),
        total:
          total.toString(),
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );
}

async function createLimitOrder({
  userId,
  symbol,
  side,
  amount,
  price,
}) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const normalizedSide =
    normalizeSide(side);

  const normalizedAmount =
    positiveDecimal(
      amount,
      "amount"
    );

  const normalizedPrice =
    positiveDecimal(
      price,
      "price"
    );

  const pair =
    SUPPORTED_SYMBOLS[
      normalizedSymbol
    ];

  const gross =
    calculateGross(
      normalizedAmount,
      normalizedPrice
    );

  const fee =
    calculateFee(
      gross
    );

  const total =
    gross.add(fee);

  const reservation =
    normalizedSide ===
    "BUY"
      ? total
      : normalizedAmount;

  return prisma.$transaction(
    async (tx) => {
      const wallet =
        await getWalletForUpdate(
          tx,
          userId
        );

      const balanceField =
        normalizedSide ===
        "BUY"
          ? getBalanceField(
              pair.quote
            )
          : getBalanceField(
              pair.base
            );

      const reservedField =
        normalizedSide ===
        "BUY"
          ? getReservedField(
              pair.quote
            )
          : getReservedField(
              pair.base
            );

      const balance =
        toDecimal(
          wallet[balanceField]
        );

      const reserved =
        toDecimal(
          wallet[reservedField]
        );

      const available =
        balance.sub(
          reserved
        );

      if (
        available.lt(
          reservation
        )
      ) {
        throw new Error(
          normalizedSide ===
          "BUY"
            ? `Insufficient ${pair.quote} available balance.`
            : `Insufficient ${pair.base} available balance.`
        );
      }

      const order =
        await tx.order.create({
          data: {
            userId,
            symbol:
              normalizedSymbol,
            side:
              normalizedSide,
            type:
              "LIMIT",
            amount:
              normalizedAmount.toString(),
            price:
              normalizedPrice.toString(),
            fee:
              fee.toString(),
            total:
              total.toString(),
            status:
              "PENDING",
            filledAmount:
              "0",
          },
        });

      await tx.wallet.update({
        where: {
          userId,
        },
        data: {
          [reservedField]:
            reserved
              .add(
                reservation
              )
              .toString(),
        },
      });

      await createLedgerEntry(
        tx,
        {
          userId,
          orderId:
            order.id,
          asset:
            normalizedSide ===
            "BUY"
              ? pair.quote
              : pair.base,
          entryType:
            "RESERVATION",
          amount:
            reservation,
          balanceAfter:
            balance,
          reference:
            `RESERVE-${order.id}`,
          description:
            `LIMIT ${normalizedSide} reservation`,
        }
      );

      return {
        order,
        reservation:
          reservation.toString(),
        fee:
          fee.toString(),
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );
}

async function executePendingLimitOrder(
  orderId
) {
  return prisma.$transaction(
    async (tx) => {
      const locked =
        await tx.$queryRaw`
          SELECT "id"
          FROM "Order"
          WHERE "id" = ${orderId}
            AND "status" = 'PENDING'
            AND "type" = 'LIMIT'
          FOR UPDATE SKIP LOCKED
        `;

      if (
        !Array.isArray(
          locked
        ) ||
        locked.length === 0
      ) {
        return null;
      }

      const order =
        await tx.order.findUnique({
          where: {
            id:
              orderId,
          },
        });

      if (
        !order ||
        order.status !==
          "PENDING" ||
        order.type !==
          "LIMIT"
      ) {
        return null;
      }

      const pair =
        SUPPORTED_SYMBOLS[
          order.symbol
        ];

      if (!pair) {
        throw new Error(
          `Unsupported symbol for order ${order.id}.`
        );
      }

      const marketPrice =
        await getMarketPrice(
          order.symbol
        );

      const limitPrice =
        toDecimal(
          order.price
        );

      const executable =
        order.side === "BUY"
          ? marketPrice.lte(
              limitPrice
            )
          : marketPrice.gte(
              limitPrice
            );

      if (!executable) {
        return null;
      }

      const wallet =
        await getWalletForUpdate(
          tx,
          order.userId
        );

      const baseField =
        getBalanceField(
          pair.base
        );

      const quoteField =
        getBalanceField(
          pair.quote
        );

      const baseReservedField =
        getReservedField(
          pair.base
        );

      const quoteReservedField =
        getReservedField(
          pair.quote
        );

      let baseBalance =
        toDecimal(
          wallet[baseField]
        );

      let quoteBalance =
        toDecimal(
          wallet[quoteField]
        );

      let baseReserved =
        toDecimal(
          wallet[
            baseReservedField
          ]
        );

      let quoteReserved =
        toDecimal(
          wallet[
            quoteReservedField
          ]
        );

      const amount =
        toDecimal(
          order.amount
        );

      const gross =
        calculateGross(
          amount,
          marketPrice
        );

      const fee =
        calculateFee(
          gross
        );

      const executionTotal =
        gross.add(fee);

      const originalReservation =
        order.side === "BUY"
          ? toDecimal(
              order.total
            )
          : amount;

      try {
        if (
          order.side === "BUY"
        ) {
          if (
            quoteReserved.lt(
              originalReservation
            )
          ) {
            throw new Error(
              "Insufficient reserved USDT."
            );
          }

          if (
            quoteBalance.lt(
              executionTotal
            )
          ) {
            throw new Error(
              "Insufficient USDT balance."
            );
          }

          quoteBalance =
            quoteBalance.sub(
              executionTotal
            );

          baseBalance =
            baseBalance.add(
              amount
            );

          quoteReserved =
            nonNegative(
              quoteReserved.sub(
                originalReservation
              )
            );
        } else {
          if (
            baseReserved.lt(
              originalReservation
            )
          ) {
            throw new Error(
              "Insufficient reserved base balance."
            );
          }

          if (
            baseBalance.lt(
              amount
            )
          ) {
            throw new Error(
              `Insufficient ${pair.base} balance.`
            );
          }

          baseBalance =
            baseBalance.sub(
              amount
            );

          quoteBalance =
            quoteBalance.add(
              gross.sub(fee)
            );

          baseReserved =
            nonNegative(
              baseReserved.sub(
                originalReservation
              )
            );
        }

        const updatedWallet =
          await tx.wallet.update({
            where: {
              userId:
                order.userId,
            },
            data: {
              [baseField]:
                baseBalance.toString(),
              [quoteField]:
                quoteBalance.toString(),
              [baseReservedField]:
                baseReserved.toString(),
              [quoteReservedField]:
                quoteReserved.toString(),
            },
          });

        const updatedOrder =
          await tx.order.update({
            where: {
              id:
                order.id,
            },
            data: {
              price:
                marketPrice.toString(),
              fee:
                fee.toString(),
              total:
                executionTotal.toString(),
              status:
                "COMPLETED",
              filledAmount:
                amount.toString(),
              executedAt:
                new Date(),
            },
          });

        const unusedReservation =
          order.side === "BUY"
            ? nonNegative(
                originalReservation.sub(
                  executionTotal
                )
              )
            : ZERO;

        if (
          unusedReservation.gt(
            ZERO
          )
        ) {
          await createLedgerEntry(
            tx,
            {
              userId:
                order.userId,
              orderId:
                order.id,
              asset:
                pair.quote,
              entryType:
                "RELEASE",
              amount:
                unusedReservation,
              balanceAfter:
                quoteBalance,
              reference:
                `RELEASE-${order.id}`,
              description:
                "Released unused limit-order reservation",
            }
          );
        }

        await createTradeLedgers(
          tx,
          {
            userId:
              order.userId,
            order:
              updatedOrder,
            pair,
            side:
              order.side,
            amount,
            gross,
            fee,
            baseBalance,
            quoteBalance,
          }
        );

        await createPlatformFeeEntry(
          tx,
          {
            orderId:
              order.id,
            asset:
              pair.quote,
            amount:
              fee,
            reference:
              `PLATFORM-FEE-${order.id}`,
          }
        );

        return {
          order:
            updatedOrder,
          wallet:
            updatedWallet,
          marketPrice:
            marketPrice.toString(),
          gross:
            gross.toString(),
          fee:
            fee.toString(),
          total:
            executionTotal.toString(),
        };
      } catch (error) {
        const reservedField =
          order.side === "BUY"
            ? quoteReservedField
            : baseReservedField;

        const balanceField =
          order.side === "BUY"
            ? quoteField
            : baseField;

        const currentReserved =
          order.side === "BUY"
            ? quoteReserved
            : baseReserved;

        if (
          currentReserved.gte(
            originalReservation
          )
        ) {
          const updatedReserved =
            nonNegative(
              currentReserved.sub(
                originalReservation
              )
            );

          const updatedWallet =
            await tx.wallet.update({
              where: {
                userId:
                  order.userId,
              },
              data: {
                [reservedField]:
                  updatedReserved.toString(),
              },
            });

          await tx.order.update({
            where: {
              id:
                order.id,
            },
            data: {
              status:
                "FAILED",
            },
          });

          await createLedgerEntry(
            tx,
            {
              userId:
                order.userId,
              orderId:
                order.id,
              asset:
                order.side === "BUY"
                  ? pair.quote
                  : pair.base,
              entryType:
                "RELEASE",
              amount:
                originalReservation,
              balanceAfter:
                toDecimal(
                  updatedWallet[
                    balanceField
                  ]
                ),
              reference:
                `RELEASE-FAILED-${order.id}`,
              description:
                "Released reservation after failed limit execution",
            }
          );
        }

        throw error;
      }
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );
}

async function processPendingOrders() {
  const orders =
    await prisma.order.findMany({
      where: {
        status:
          "PENDING",
        type:
          "LIMIT",
      },
      orderBy: {
        createdAt:
          "asc",
      },
      take: 100,
    });

  const executed = [];

  for (
    const order of orders
  ) {
    try {
      const result =
        await executePendingLimitOrder(
          order.id
        );

      if (result) {
        executed.push(result);
      }
    } catch (error) {
      console.error(
        `❌ Limit order ${order.id} error:`,
        error.message
      );
    }
  }

  return executed;
}

async function cancelOrder({
  userId,
  orderId,
}) {
  const id = Number(
    orderId
  );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Invalid order ID."
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const order =
        await tx.order.findFirst({
          where: {
            id,
            userId,
          },
        });

      if (!order) {
        throw new Error(
          "Order not found."
        );
      }

      if (
        order.status !==
          "PENDING" ||
        order.type !==
          "LIMIT"
      ) {
        throw new Error(
          "Only pending limit orders can be cancelled."
        );
      }

      const pair =
        SUPPORTED_SYMBOLS[
          order.symbol
        ];

      if (!pair) {
        throw new Error(
          "Unsupported trading pair."
        );
      }

      const wallet =
        await getWalletForUpdate(
          tx,
          userId
        );

      const reservedField =
        order.side === "BUY"
          ? getReservedField(
              pair.quote
            )
          : getReservedField(
              pair.base
            );

      const balanceField =
        order.side === "BUY"
          ? getBalanceField(
              pair.quote
            )
          : getBalanceField(
              pair.base
            );

      const reservedAmount =
        order.side === "BUY"
          ? toDecimal(
              order.total
            )
          : toDecimal(
              order.amount
            );

      const currentReserved =
        toDecimal(
          wallet[reservedField]
        );

      const newReserved =
        nonNegative(
          currentReserved.sub(
            reservedAmount
          )
        );

      const updatedWallet =
        await tx.wallet.update({
          where: {
            userId,
          },
          data: {
            [reservedField]:
              newReserved.toString(),
          },
        });

      const updatedOrder =
        await tx.order.update({
          where: {
            id:
              order.id,
          },
          data: {
            status:
              "CANCELLED",
          },
        });

      await createLedgerEntry(
        tx,
        {
          userId,
          orderId:
            order.id,
          asset:
            order.side === "BUY"
              ? pair.quote
              : pair.base,
          entryType:
            "RELEASE",
          amount:
            reservedAmount,
          balanceAfter:
            toDecimal(
              updatedWallet[
                balanceField
              ]
            ),
          reference:
            `RELEASE-${order.id}`,
          description:
            `LIMIT ${order.side} reservation released`,
        }
      );

      return updatedOrder;
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );
}

async function getUserOrders(
  userId,
  options = {}
) {
  const take =
    Math.min(
      Math.max(
        Number(
          options.limit
        ) || 50,
        1
      ),
      200
    );

  const where = {
    userId,
  };

  if (options.symbol) {
    where.symbol =
      normalizeSymbol(
        options.symbol
      );
  }

  if (options.status) {
    const status =
      String(
        options.status
      )
        .trim()
        .toUpperCase();

    if (
      ![
        "PENDING",
        "COMPLETED",
        "CANCELLED",
        "FAILED",
      ].includes(
        status
      )
    ) {
      throw new Error(
        "Invalid order status."
      );
    }

    where.status =
      status;
  }

  return prisma.order.findMany({
    where,
    orderBy: {
      createdAt:
        "desc",
    },
    take,
  });
}

async function getOrderById(
  userId,
  orderId
) {
  const id =
    Number(orderId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      id,
      userId,
    },
  });
}

module.exports = {
  TRADING_FEE_RATE,
  SUPPORTED_SYMBOLS,
  executeMarketOrder,
  createLimitOrder,
  executePendingLimitOrder,
  processPendingOrders,
  cancelOrder,
  getUserOrders,
  getOrderById,
  getMarketPrice,
};