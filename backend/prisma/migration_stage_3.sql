ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "rialReserved" DECIMAL(25,2) NOT NULL DEFAULT 0;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "btcReserved" DECIMAL(30,10) NOT NULL DEFAULT 0;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "ethReserved" DECIMAL(30,10) NOT NULL DEFAULT 0;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "solReserved" DECIMAL(30,10) NOT NULL DEFAULT 0;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "trxReserved" DECIMAL(30,10) NOT NULL DEFAULT 0;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "usdtReserved" DECIMAL(30,8) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_userId_status_idx"
ON "Order" ("userId", "status");

CREATE INDEX IF NOT EXISTS "Order_status_type_idx"
ON "Order" ("status", "type");

CREATE INDEX IF NOT EXISTS "Order_symbol_status_idx"
ON "Order" ("symbol", "status");

CREATE INDEX IF NOT EXISTS "WalletLedgerEntry_userId_createdAt_idx"
ON "WalletLedgerEntry" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "WalletLedgerEntry_orderId_idx"
ON "WalletLedgerEntry" ("orderId");

CREATE INDEX IF NOT EXISTS "PlatformFeeLedger_status_createdAt_idx"
ON "PlatformFeeLedger" ("status", "createdAt");