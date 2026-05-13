-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalMethodType" AS ENUM ('BANK', 'MOBILE_BANKING');

-- CreateTable
CREATE TABLE "withdrawal_methods" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "methodType" "WithdrawalMethodType" NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "accountName" VARCHAR(100) NOT NULL,
    "bankName" VARCHAR(100),
    "branchName" VARCHAR(100),
    "routingNumber" VARCHAR(50),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "withdrawalMethodId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "cancellationReason" TEXT,
    "rejectionReason" TEXT,
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "refWalletTnxId" TEXT,
    "processedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "withdrawal_methods_walletId_idx" ON "withdrawal_methods"("walletId");

-- CreateIndex
CREATE INDEX "withdrawal_methods_isActive_idx" ON "withdrawal_methods"("isActive");

-- CreateIndex
CREATE INDEX "withdrawal_requests_walletId_idx" ON "withdrawal_requests"("walletId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_withdrawalMethodId_idx" ON "withdrawal_requests"("withdrawalMethodId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_createdAt_idx" ON "withdrawal_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "withdrawal_methods" ADD CONSTRAINT "withdrawal_methods_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_withdrawalMethodId_fkey" FOREIGN KEY ("withdrawalMethodId") REFERENCES "withdrawal_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
