/*
  Warnings:

  - You are about to drop the column `isVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `KYC` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'SUPER_ADMIN';

-- DropForeignKey
ALTER TABLE "public"."KYC" DROP CONSTRAINT "KYC_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "isVerified",
DROP COLUMN "twoFactorEnabled",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "nationalCode" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "phone" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."KYC";

-- DropTable
DROP TABLE "public"."Order";

-- DropTable
DROP TABLE "public"."RefreshToken";

-- DropTable
DROP TABLE "public"."Transaction";

-- DropTable
DROP TABLE "public"."Wallet";

-- DropEnum
DROP TYPE "public"."OrderSide";

-- DropEnum
DROP TYPE "public"."OrderStatus";

-- DropEnum
DROP TYPE "public"."OrderType";

-- DropEnum
DROP TYPE "public"."VerificationStatus";
