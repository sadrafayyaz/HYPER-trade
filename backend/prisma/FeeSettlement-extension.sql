-- Hyper Trade: non-destructive extension for multi-currency fee settlement.
-- Run once against the existing PostgreSQL database before using the
-- destination-country / destination-currency settlement endpoints.

ALTER TABLE "FeeSettlement"
  ADD COLUMN IF NOT EXISTS "sourceAmount" DECIMAL(38,18),
  ADD COLUMN IF NOT EXISTS "sourceAsset" "LedgerAsset",
  ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(38,18),
  ADD COLUMN IF NOT EXISTS "exchangeRateSource" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedAmount" DECIMAL(38,18),
  ADD COLUMN IF NOT EXISTS "destinationCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "cardCountryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "cardBin" TEXT,
  ADD COLUMN IF NOT EXISTS "cardLast4" TEXT;

CREATE INDEX IF NOT EXISTS "FeeSettlement_destinationCountry_idx"
  ON "FeeSettlement" ("destinationCountry");

CREATE INDEX IF NOT EXISTS "FeeSettlement_destinationCurrency_idx"
  ON "FeeSettlement" ("destinationCurrency");
