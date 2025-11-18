import config from "../../config";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { PaymentPayload } from "./payment.interface";
import { getDefaultDescription } from "./payment.utils";

const commissionRate = config.commissionRate;

const cashPaymentInitService = async (userId: string, taskId: string) => {
  try {
    // check if task exists and belongs to the user
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { payments: true, approvedApplication: true },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    // TODO: later accept multiple payments for a task if needed
    if (task.payments.length > 0) {
      throw new AppError(400, "Payment already initiated for this task!");
    }
    if (task.postedById !== userId) {
      throw new AppError(
        400,
        "You are not authorized to make payment for this task!"
      );
    }
    if (task.status !== "PAYMENT_PROCESSING") {
      throw new AppError(400, "Task is not approved for payment processing!");
    }
    if (!task.approvedApplication) {
      throw new AppError(400, "No approved application found for this task!");
    }

    // create a transaction id
    const transactionId = createTnxId("TNX");
    // Business logic for initializing cash payment
    const paymentPayload: PaymentPayload = {
      transactionId,
      taskId,
      payerId: userId,
      payeeId: task.approvedApplication.applicantId,
      amount: Number(task.agreedCompensation),
      method: "CASH",
      cashStatus: "PAYER_CLAIMED",
      posterConfirmedAt: new Date(),
      commissionRate,
      commissionAmount: Number(task.agreedCompensation) * commissionRate,
    };
    const payment = await prisma.payment.create({
      data: paymentPayload,
    });
    return payment;
  } catch (error) {
    console.error("Error in cashPaymentInitService:", error);
    throw error;
  }
};
const cashPaymentConfirmService = async (userId: string, paymentId: string) => {
  try {
    // security checks
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId },
      include: { task: true },
    });
    if (!payment) {
      throw new AppError(404, "Payment not found");
    }
    if (payment.method !== "CASH") {
      throw new AppError(400, "This is not a cash payment!");
    }
    if (payment.payeeId !== userId) {
      throw new AppError(403, "You are not authorized to confirm this payment");
    }

    if (payment.cashStatus === "PAYEE_CONFIRMED") {
      throw new AppError(400, "Payment is already confirmed!");
    }
    if (payment.cashStatus !== "PAYER_CLAIMED") {
      throw new AppError(400, "Payment is not in a confirmable state!");
    }
    // Business logic for confirming cash payment

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Update payment status
      const paymentUpdate = await tx.payment.update({
        where: { id: paymentId },
        data: {
          cashStatus: "PAYEE_CONFIRMED",
          status: "COMPLETED",
          paidAt: new Date(),
          payeeConfirmedAt: new Date(),
        },
      });

      // Check wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { userId: payment.payeeId },
      });

      if (!wallet) {
        throw new AppError(404, "Wallet not found for payee");
      }
      const commissionAmount =
        payment.commissionAmount || Number(payment.amount) * commissionRate;
      if (wallet.balance >= commissionAmount) {
        // Debit commission from wallet
        await tx.wallet.update({
          where: { userId: payment.payeeId },
          data: { balance: { decrement: commissionAmount } },
        });

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            transactionId: createTnxId("WTNX"),
            amount: commissionAmount,
            type: "DEBIT",
            category: "DIRECT_COMMISSION_DEDUCTION",
            refPaymentId: payment.id,
            description: getDefaultDescription("DIRECT_COMMISSION_DEDUCTION"),
            createdAt: new Date(),
          },
        });
      } else {
        // Create commission due record
        await tx.commissionDue.create({
          data: {
            walletId: wallet.id,
            taskId: payment.taskId,
            amount: commissionAmount,
          },
        });
      }

      return paymentUpdate;
    });
    return updatedPayment;
  } catch (error) {
    console.error("Error in cashPaymentConfirmService:", error);
    throw error;
  }
};
const cashPaymentDeclineService = async (userId: string, paymentId: string) => {
  try {
    // security checks
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId },
      include: { task: true },
    });
    if (!payment) {
      throw new AppError(404, "Payment not found");
    }
    if (payment.method !== "CASH") {
      throw new AppError(400, "This is not a cash payment!");
    }
    if (payment.payeeId !== userId) {
      throw new AppError(403, "You are not authorized to confirm this payment");
    }
    if (payment.cashStatus === "PAYEE_CONFIRMED") {
      throw new AppError(400, "can't decline an already accepted payment!");
    }
    if (payment.cashStatus === "PAYEE_DISPUTED") {
      throw new AppError(400, "Payment is already declined!");
    }
    // Business logic for confirming cash payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { cashStatus: "PAYEE_DISPUTED", payeeDeclinedAt: new Date() },
    });
    return updatedPayment;
  } catch (error) {
    console.error("Error in cashPaymentConfirmService:", error);
    throw error;
  }
};

const onlinePaymentInitService = async (userId: string, taskId: string) => {
  try {
    // Business logic for initializing cash payment
  } catch (error) {
    console.error("Error in onlinePaymentInitService:", error);
    throw error;
  }
};

export {
  cashPaymentConfirmService,
  cashPaymentDeclineService,
  cashPaymentInitService,
  onlinePaymentInitService,
};
