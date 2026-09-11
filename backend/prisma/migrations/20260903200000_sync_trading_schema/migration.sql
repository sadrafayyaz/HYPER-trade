/*
  Hyper Trade - Schema Synchronization Migration

  Purpose:
  - Synchronize the existing PostgreSQL database with the current Prisma schema.
  - Preserve all existing User, Wallet and Order data.
  - Add OrderType and Ledger-related enums.
  - Extend Order and Wallet safely.
  - Create WalletLedgerEntry and PlatformFeeLedger.
*/

-- =========================================================
-- 1. Create OrderType enum
-- =========================================================

CREATE TYPE "public"."OrderType" AS ENUM (
    'MARKET',
    'LIMIT'
);


-- =========================================================
-- 2. Extend Order table
-- =========================================================

ALTER TABLE "public"."Order"
ADD COLUMN "type" "public"."OrderType" NOT NULL DEFAULT 'MARKET';

ALTER TABLE "public"."Order"
ADD COLUMN "filledAmount" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Order"
ADD COLUMN "executedAt" TIMESTAMP(3);


-- =========================================================
-- 3. Extend Wallet table
-- =========================================================

ALTER TABLE "public"."Wallet"
ADD COLUMN "trxBalance" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedRialBalance" DECIMAL(30,2) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedBtcBalance" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedEthBalance" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedSolBalance" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedTrxBalance" DECIMAL(30,12) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Wallet"
ADD COLUMN "reservedUsdtBalance" DECIMAL(30,8) NOT NULL DEFAULT 0;


-- =========================================================
-- 4. Create LedgerAsset enum
-- =========================================================

CREATE TYPE "public"."LedgerAsset" AS ENUM (
    'RIAL',
    'BTC',
    'ETH',
    'SOL',
    'TRX',
    'USDT'
);


-- =========================================================
-- 5. Create LedgerEntryType enum
-- =========================================================

CREATE TYPE "public"."LedgerEntryType" AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'TRADE_DEBIT',
    'TRADE_CREDIT',
    'FEE',
    'REFUND',
    'RESERVATION',
    'RELEASE',
    'ADJUSTMENT'
);


-- =========================================================
-- 6. Create FeeStatus enum
-- =========================================================

CREATE TYPE "public"."FeeStatus" AS ENUM (
    'ACCRUED',
    'SETTLED',
    'CANCELLED'
);


-- =========================================================
-- 7. Create WalletLedgerEntry table
-- =========================================================

CREATE TABLE "public"."WalletLedgerEntry" (
    "id" BIGSERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,

    "asset" "public"."LedgerAsset" NOT NULL,
    "entryType" "public"."LedgerEntryType" NOT NULL,

    "amount" DECIMAL(38,18) NOT NULL,
    "balanceAfter" DECIMAL(38,18) NOT NULL,

    "reference" TEXT NOT NULL,
    "description" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey"
        PRIMARY KEY ("id")
);


-- =========================================================
-- 8. WalletLedgerEntry indexes
-- =========================================================

CREATE UNIQUE INDEX "WalletLedgerEntry_reference_key"
    ON "public"."WalletLedgerEntry"("reference");

CREATE INDEX "WalletLedgerEntry_userId_createdAt_idx"
    ON "public"."WalletLedgerEntry"("userId", "createdAt");

CREATE INDEX "WalletLedgerEntry_orderId_idx"
    ON "public"."WalletLedgerEntry"("orderId");

CREATE INDEX "WalletLedgerEntry_asset_idx"
    ON "public"."WalletLedgerEntry"("asset");


-- =========================================================
-- 9. WalletLedgerEntry foreign key
-- =========================================================

ALTER TABLE "public"."WalletLedgerEntry"
ADD CONSTRAINT "WalletLedgerEntry_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "public"."User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- =========================================================
-- 10. Create PlatformFeeLedger table
-- =========================================================

CREATE TABLE "public"."PlatformFeeLedger" (
    "id" BIGSERIAL NOT NULL,

    "orderId" INTEGER NOT NULL,

    "asset" "public"."LedgerAsset" NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,

    "status" "public"."FeeStatus" NOT NULL DEFAULT 'ACCRUED',

    "ownerLabel" TEXT NOT NULL DEFAULT 'Hyper Trade Owner Account',

    "reference" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeLedger_pkey"
        PRIMARY KEY ("id")
);


-- =========================================================
-- 11. PlatformFeeLedger indexes / unique constraints
-- =========================================================

CREATE UNIQUE INDEX "PlatformFeeLedger_orderId_key"
    ON "public"."PlatformFeeLedger"("orderId");

CREATE UNIQUE INDEX "PlatformFeeLedger_reference_key"
    ON "public"."PlatformFeeLedger"("reference");

CREATE INDEX "PlatformFeeLedger_status_idx"
    ON "public"."PlatformFeeLedger"("status");

CREATE INDEX "PlatformFeeLedger_createdAt_idx"
    ON "public"."PlatformFeeLedger"("createdAt");