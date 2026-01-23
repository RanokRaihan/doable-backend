-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationSentAt" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" VARCHAR(255);
