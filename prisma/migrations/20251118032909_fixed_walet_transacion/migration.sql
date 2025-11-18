/*
  Warnings:

  - You are about to drop the column `refPaymentTxnId` on the `wallet_transactions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "wallet_transactions_refPaymentTxnId_idx";

-- AlterTable
ALTER TABLE "wallet_transactions" DROP COLUMN "refPaymentTxnId",
ADD COLUMN     "refPaymentId" TEXT;

-- CreateIndex
CREATE INDEX "wallet_transactions_refPaymentId_idx" ON "wallet_transactions"("refPaymentId");
