/*
  Warnings:

  - Added the required column `transactionId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommissionPaymentMethod" AS ENUM ('WALLET_DEDUCTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "CashStatus" AS ENUM ('NO_CASH', 'PAYER_PAID', 'PAYEE_ACCEPTED', 'PAYEE_DECLINED', 'ADMIN_VERIFIED');

-- AlterTable
ALTER TABLE "commission_dues" ADD COLUMN     "paymentMethod" "CommissionPaymentMethod";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "cashAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "cashStatus" "CashStatus" NOT NULL DEFAULT 'NO_CASH',
ADD COLUMN     "transactionId" TEXT NOT NULL;
