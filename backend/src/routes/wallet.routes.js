const express = require("express");

const {
  getWalletSummary,
  getAssetBalance,
  createInternalDeposit,
  withdraw,
  getLedger,
} = require("../services/wallet.service");

const router = express.Router();

function requireUser(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  next();
}

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const wallet = await getWalletSummary(req.user.id);

    return res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/balance/:asset", async (req, res) => {
  try {
    const result = await getAssetBalance(
      req.user.id,
      req.params.asset
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/ledger", async (req, res) => {
  try {
    const result = await getLedger(req.user.id, {
      asset: req.query.asset,
      entryType: req.query.entryType,
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/*
 * DEVELOPMENT ONLY
 *
 * This endpoint exists only for local wallet testing.
 * It cannot be used when NODE_ENV=production.
 */
router.post("/deposit/internal", async (req, res) => {
  try {
    const { asset, amount, description } = req.body;

    const result = await createInternalDeposit(
      req.user.id,
      asset,
      amount,
      description
    );

    return res.status(201).json({
      success: true,
      message: "Internal deposit completed",
      wallet: {
        id: result.wallet.id,
        userId: result.wallet.userId,
        rialBalance: result.wallet.rialBalance.toString(),
        btcBalance: result.wallet.btcBalance.toString(),
        ethBalance: result.wallet.ethBalance.toString(),
        solBalance: result.wallet.solBalance.toString(),
        trxBalance: result.wallet.trxBalance.toString(),
        usdtBalance: result.wallet.usdtBalance.toString(),
      },
      ledger: {
        id: result.ledgerEntry.id.toString(),
        asset: result.ledgerEntry.asset,
        entryType: result.ledgerEntry.entryType,
        amount: result.ledgerEntry.amount.toString(),
        balanceAfter:
          result.ledgerEntry.balanceAfter.toString(),
        reference: result.ledgerEntry.reference,
      },
    });
  } catch (error) {
    console.error("Internal deposit error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const { asset, amount, description } = req.body;

    const result = await withdraw(
      req.user.id,
      asset,
      amount,
      description
    );

    return res.status(201).json({
      success: true,
      message: "Withdrawal completed",
      wallet: {
        id: result.wallet.id,
        userId: result.wallet.userId,
        rialBalance: result.wallet.rialBalance.toString(),
        btcBalance: result.wallet.btcBalance.toString(),
        ethBalance: result.wallet.ethBalance.toString(),
        solBalance: result.wallet.solBalance.toString(),
        trxBalance: result.wallet.trxBalance.toString(),
        usdtBalance: result.wallet.usdtBalance.toString(),
      },
      ledger: {
        id: result.ledgerEntry.id.toString(),
        asset: result.ledgerEntry.asset,
        entryType: result.ledgerEntry.entryType,
        amount: result.ledgerEntry.amount.toString(),
        balanceAfter:
          result.ledgerEntry.balanceAfter.toString(),
        reference: result.ledgerEntry.reference,
      },
    });
  } catch (error) {
    console.error("Withdrawal error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;