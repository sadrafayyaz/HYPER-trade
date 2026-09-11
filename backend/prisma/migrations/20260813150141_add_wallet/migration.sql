-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rialBalance" DECIMAL(30,2) NOT NULL DEFAULT 0,
    "btcBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "ethBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "solBalance" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "usdtBalance" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "public"."Wallet"("userId");

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
