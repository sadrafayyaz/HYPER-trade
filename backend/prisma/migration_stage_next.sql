-- Run only after backing up trading_ai.
-- This migration preserves existing User/Wallet/Order data.

ALTER TABLE "Wallet"
  ADD COLUMN IF NOT EXISTS "reservedRialBalance" DECIMAL(30,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservedBtcBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservedEthBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservedSolBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trxBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservedTrxBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservedUsdtBalance" DECIMAL(30,8) NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'MARKET',
  ADD COLUMN IF NOT EXISTS "filledAmount" DECIMAL(30,12) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "OrderType" AS ENUM ('MARKET','LIMIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Order"
  ALTER COLUMN "type" TYPE "OrderType" USING "type"::"OrderType";

DO $$ BEGIN
  CREATE TYPE "LedgerAsset" AS ENUM ('RIAL','BTC','ETH','SOL','TRX','USDT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('DEPOSIT','WITHDRAWAL','TRADE_DEBIT','TRADE_CREDIT','FEE','REFUND','RESERVATION','RELEASE','ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FeeStatus" AS ENUM ('ACCRUED','SETTLED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "WalletLedgerEntry" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "asset" "LedgerAsset" NOT NULL,
  "entryType" "LedgerEntryType" NOT NULL,
  "amount" DECIMAL(38,18) NOT NULL,
  "balanceAfter" DECIMAL(38,18) NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "WalletLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "WalletLedgerEntry_userId_createdAt_idx" ON "WalletLedgerEntry"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "WalletLedgerEntry_orderId_idx" ON "WalletLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "WalletLedgerEntry_asset_idx" ON "WalletLedgerEntry"("asset");

CREATE TABLE IF NOT EXISTS "PlatformFeeLedger" (
  "id" BIGSERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL UNIQUE,
  "asset" "LedgerAsset" NOT NULL,
  "amount" DECIMAL(38,18) NOT NULL,
  "status" "FeeStatus" NOT NULL DEFAULT 'ACCRUED',
  "ownerLabel" TEXT NOT NULL DEFAULT 'Hyper Trade Owner Account',
  "reference" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformFeeLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlatformFeeLedger_status_idx" ON "PlatformFeeLedger"("status");
CREATE INDEX IF NOT EXISTS "PlatformFeeLedger_createdAt_idx" ON "PlatformFeeLedger"("createdAt");


-- Add TRX to an existing LedgerAsset enum when the enum was created by an earlier migration.
DO $$ BEGIN
  ALTER TYPE "LedgerAsset" ADD VALUE IF NOT EXISTS 'TRX';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
