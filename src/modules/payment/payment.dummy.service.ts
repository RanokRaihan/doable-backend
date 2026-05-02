import { WalletTransactionCategory } from "../../generated/prisma/enums";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { IpnQuery } from "./payment.interface";
import { getDefaultDescription } from "./payment.utils";

// validate online payment service
export const dummyValidateOnlinePaymentService = async (payload: IpnQuery) => {
  try {
    if (!payload || !payload.tran_id || !payload.status || !payload.val_id) {
      throw new AppError(400, "Invalid IPN payload", "INVALID_PAYLOAD", "ipn");
    }
    if (payload.status !== "VALID") {
      throw new AppError(400, "Payment not valid", "PAYMENT_INVALID", "ipn");
    }
    const response = {
      data: {
        tran_id: payload.tran_id,
        status: payload.status,
        amount: payload.amount,
      },
    };

    if (
      response.data.status !== "VALID" &&
      response.data.status !== "VALIDATED"
    ) {
      throw new AppError(
        400,
        "Payment validation failed",
        "PAYMENT_VALIDATION_FAILED",
        "ipn"
      );
    }
    const paymentRecord = await prisma.payment.findFirst({
      where: { transactionId: response.data.tran_id },
      select: {
        id: true,
        status: true,
        amount: true,
        payeeId: true,
        commissionAmount: true,
        taskId: true,
        paidAt: true,
      },
    });
    if (!paymentRecord) {
      throw new AppError(404, "Payment record not found", "NOT_FOUND", "ipn");
    }
    if (paymentRecord.status === "COMPLETED") {
      return paymentRecord;
    }

    const finalPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { transactionId: response.data.tran_id, status: "PENDING" },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          metadata: response.data,
          ipnReceivedAt: new Date(),
          ipnReceived: true,
        },
      });
      // create two wallet transactions: total amount credit to payee, commission debit to payee
      const wallet = await tx.wallet.findUnique({
        where: { userId: updatedPayment.payeeId },
      });
      if (!wallet) {
        // TODO: send notification to admin about missing wallet
        throw new AppError(404, "Wallet not found for payee");
      }
      // create a transaction id
      const tnxID = createTnxId("WTNX");

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionId: tnxID,
          amount: updatedPayment.amount,
          type: "CREDIT",
          category: WalletTransactionCategory.TASK_PAYMENT,
          refPaymentId: updatedPayment.id,
          description: getDefaultDescription("TASK_PAYMENT"),
          balanceAfter: Number(wallet.balance) + Number(updatedPayment.amount),
          balanceBefore: Number(wallet.balance),
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { userId: updatedPayment.payeeId },
        data: { balance: { increment: updatedPayment.amount } },
      });

      // commission deduction
      const commissionAmount =
        Number(updatedPayment.commissionAmount) ||
        Number(updatedPayment.amount) * 0.15; // default 15% commission

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionId: createTnxId("WTNX"),
          amount: commissionAmount,
          type: "DEBIT",
          category: WalletTransactionCategory.DIRECT_COMMISSION_DEDUCTION,
          refPaymentId: updatedPayment.id,
          description: getDefaultDescription("DIRECT_COMMISSION_DEDUCTION"),
          balanceAfter: Number(updatedWallet.balance) - commissionAmount,
          balanceBefore: Number(updatedWallet.balance),
        },
      });

      // update wallet balance
      await tx.wallet.update({
        where: { userId: updatedPayment.payeeId },
        data: { balance: { decrement: commissionAmount } },
      });
      const finalPayment = await tx.payment.update({
        where: { id: updatedPayment.id },
        data: { commissionDeducted: true },
        select: {
          id: true,
          status: true,
          transactionId: true,
          amount: true,
          method: true,
        },
      });
      await tx.task.update({
        where: { id: updatedPayment.taskId },
        data: { status: "COMPLETED" },
      });
      return finalPayment;
    });

    return finalPayment;
  } catch (error) {
    console.error("Error in validateOnlinePaymentService:", error);
    throw error;
  }
};
