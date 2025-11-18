/*
  Warnings:

  - The values [NO_CASH,PAYER_PAID,PAYEE_ACCEPTED,PAYEE_DECLINED] on the enum `CashStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING,PARTIAL] on the enum `CommissionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [COMMISSION_DEDUCTION,MANUAL_COMMISSION_PAYMENT] on the enum `WalletTransactionCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paymentMethod` on the `commission_dues` table. All the data in the column will be lost.
  - You are about to drop the column `referenceTxnId` on the `commission_dues` table. All the data in the column will be lost.
  - You are about to drop the column `cashAcceptedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `wallet_transactions` table. All the data in the column will be lost.
  - The `status` column on the `wallet_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[transactionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `commissionAmount` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `transactionId` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INITIAL', 'REFUND', 'RETRY', 'TIP', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "CashStatus_new" AS ENUM ('PAYER_CLAIMED', 'PAYEE_CONFIRMED', 'PAYEE_DISPUTED', 'ADMIN_VERIFIED');
ALTER TABLE "public"."payments" ALTER COLUMN "cashStatus" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "cashStatus" TYPE "CashStatus_new" USING ("cashStatus"::text::"CashStatus_new");
ALTER TYPE "CashStatus" RENAME TO "CashStatus_old";
ALTER TYPE "CashStatus_new" RENAME TO "CashStatus";
DROP TYPE "public"."CashStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CommissionStatus_new" AS ENUM ('DUE', 'PAID', 'CANCELLED');
ALTER TABLE "public"."commission_dues" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "commission_dues" ALTER COLUMN "status" TYPE "CommissionStatus_new" USING ("status"::text::"CommissionStatus_new");
ALTER TYPE "CommissionStatus" RENAME TO "CommissionStatus_old";
ALTER TYPE "CommissionStatus_new" RENAME TO "CommissionStatus";
DROP TYPE "public"."CommissionStatus_old";
ALTER TABLE "commission_dues" ALTER COLUMN "status" SET DEFAULT 'DUE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WalletTransactionCategory_new" AS ENUM ('TASK_PAYMENT', 'DIRECT_COMMISSION_DEDUCTION', 'DUE_COMMISSION_DEDUCTION', 'BONUS', 'REFUND', 'WITHDRAWAL');
ALTER TABLE "wallet_transactions" ALTER COLUMN "category" TYPE "WalletTransactionCategory_new" USING ("category"::text::"WalletTransactionCategory_new");
ALTER TYPE "WalletTransactionCategory" RENAME TO "WalletTransactionCategory_old";
ALTER TYPE "WalletTransactionCategory_new" RENAME TO "WalletTransactionCategory";
DROP TYPE "public"."WalletTransactionCategory_old";
COMMIT;

-- AlterTable
ALTER TABLE "commission_dues" DROP COLUMN "paymentMethod",
DROP COLUMN "referenceTxnId",
ADD COLUMN     "paidViaPayment" TEXT,
ADD COLUMN     "paidViaTxn" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DUE';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "cashAcceptedAt",
ADD COLUMN     "commissionDeducted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "payeeConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "posterConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'INITIAL',
ALTER COLUMN "commissionAmount" SET NOT NULL,
ALTER COLUMN "cashStatus" DROP NOT NULL,
ALTER COLUMN "cashStatus" DROP DEFAULT;

-- AlterTable
ALTER TABLE "wallet_transactions" DROP COLUMN "referenceId",
ADD COLUMN     "balanceAfter" DECIMAL(10,2),
ADD COLUMN     "balanceBefore" DECIMAL(10,2),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "refCommissionDueId" TEXT,
ADD COLUMN     "refPaymentTxnId" TEXT,
ADD COLUMN     "transactionId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED';

-- DropEnum
DROP TYPE "CommissionPaymentMethod";

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_cashStatus_idx" ON "payments"("cashStatus");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_payeeId_status_idx" ON "payments"("payeeId", "status");

-- CreateIndex
CREATE INDEX "payments_method_status_idx" ON "payments"("method", "status");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_transactionId_key" ON "wallet_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "wallet_transactions_transactionId_idx" ON "wallet_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_refPaymentTxnId_idx" ON "wallet_transactions"("refPaymentTxnId");

-- CreateIndex
CREATE INDEX "wallet_transactions_refCommissionDueId_idx" ON "wallet_transactions"("refCommissionDueId");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");
