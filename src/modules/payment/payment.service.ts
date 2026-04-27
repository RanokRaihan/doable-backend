import { WalletTransactionCategory } from "@prisma/client";
import axios from "axios";
import crypto from "crypto";
import config from "../../config";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { IpnQuery, PaymentPayload } from "./payment.interface";
import { getDefaultDescription } from "./payment.utils";
const commissionRate = config.commissionRate;

const cashPaymentInitService = async (userId: string, taskId: string) => {
  try {
    // check if task exists and belongs to the user
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: {
        payments: true,
        approvedApplication: true,
      },
    });

    if (!task) {
      throw new AppError(404, "Task not found");
    }

    if (task.postedById !== userId) {
      throw new AppError(
        403,
        "You are not authorized to make payment for this task!",
      );
    }

    if (task.status !== "PAYMENT_PROCESSING") {
      throw new AppError(400, "Task is not approved for payment processing!");
    }

    if (!task.approvedApplication) {
      throw new AppError(400, "No approved application found for this task!");
    }

    // 2.2 Check for existing CASH payments
    const cashPayments = task.payments.find((p) => p.method === "CASH");
    if (cashPayments) {
      throw new AppError(
        400,
        "Cash payment already initiated for this task!",
        "DUPLICATE_PAYMENT",
        "payment",
      );
    }

    // 2.1 Check for existing ONLINE payments
    const onlinePayments = task.payments.filter((p) => p.method === "ONLINE");

    // Block if online payment is COMPLETED
    const completedOnlinePayment = onlinePayments.find(
      (p) => p.status === "COMPLETED",
    );

    if (completedOnlinePayment) {
      throw new AppError(
        400,
        "Online payment already completed for this task!",
        "DUPLICATE_PAYMENT",
        "payment",
      );
    }

    // Block if online payment is PENDING and not expired
    const pendingOnlinePayment = onlinePayments.find(
      (p) => p.status === "PENDING",
    );

    if (pendingOnlinePayment) {
      const now = new Date();
      const expiresAt = pendingOnlinePayment.sessionExpiresAt;

      if (expiresAt && expiresAt > now) {
        throw new AppError(
          400,
          "You have a pending online payment. Please complete or wait for it to expire before using cash payment.",
          "PENDING_ONLINE_PAYMENT",
          "payment",
        );
      }

      // If expired, mark as failed
      await prisma.payment.update({
        where: { id: pendingOnlinePayment.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureReason: "Payment session expired - user switched to cash",
        },
      });
    }

    // FAILED and CANCELLED online payments are ignored - user can switch to cash

    // create a transaction id
    const transactionId = createTnxId("TNX");
    const amount = Number(task.agreedCompensation);
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    // Business logic for initializing cash payment
    const paymentPayload: PaymentPayload = {
      transactionId,
      taskId,
      payerId: userId,
      payeeId: task.approvedApplication.applicantId,
      amount,
      method: "CASH",
      cashStatus: "PAYER_CLAIMED",
      posterConfirmedAt: new Date(),
      commissionRate,
      commissionAmount,
    };
    const payment = await prisma.payment.create({
      data: paymentPayload,
      select: {
        id: true,
        transactionId: true,
        amount: true,
        method: true,
        status: true,
        cashStatus: true,
      },
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
        select: {
          id: true,
          transactionId: true,
          paidAt: true,
          payeeConfirmedAt: true,
          payerId: true,
          payeeId: true,
          amount: true,
          method: true,
          status: true,
          cashStatus: true,
        },
      });
      await tx.task.update({
        where: { id: payment.taskId },
        data: { status: "COMPLETED" },
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
        const updatedWallet = await tx.wallet.update({
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
            balanceAfter: Number(updatedWallet.balance),
            balanceBefore: Number(wallet.balance),
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { commissionDeducted: true },
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
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { cashStatus: "PAYEE_DISPUTED", payeeDeclinedAt: new Date() },
      });
      await tx.task.update({
        where: { id: payment.taskId },
        data: { status: "DISPUTED" },
      });
      return updatedPayment;
    });

    return updatedPayment;
  } catch (error) {
    console.error("Error in cashPaymentDeclineService:", error);
    throw error;
  }
};

const onlinePaymentInitService = async (userId: string, taskId: string) => {
  const {
    storeId,
    storePassword,
    successUrl,
    failUrl,
    cancelUrl,
    gatewayBaseUrl,
  } = config.sslcommerz;

  try {
    // 1. Validate task and permissions
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: {
        payments: true,
        approvedApplication: {
          include: {
            applicant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!task) {
      throw new AppError(404, "Task not found", "NOT_FOUND", "task");
    }

    if (task.postedById !== userId) {
      throw new AppError(
        403,
        "You are not authorized to make payment for this task!",
        "FORBIDDEN",
        "payment",
      );
    }

    if (task.status !== "PAYMENT_PROCESSING") {
      throw new AppError(
        400,
        "Task is not approved for payment processing!",
        "INVALID_TASK_STATUS",
        "task",
      );
    }

    if (!task.approvedApplication) {
      throw new AppError(
        400,
        "No approved application found for this task!",
        "NO_APPROVED_APPLICATION",
        "task",
      );
    }
    // 2.1 Fetch existing cash payments for the task
    const existingCashPayment = task.payments.find((p) => p.method === "CASH");

    if (existingCashPayment) {
      throw new AppError(
        400,
        "Cash payment already initiated for this task!",
        "DUPLICATE_PAYMENT",
        "payment",
      );
    }

    // 2.2 Check for existing online payments
    const onlinePayments = task.payments.filter((p) => p.method === "ONLINE");

    // Handle existing COMPLETED payment
    const completedPayment = onlinePayments.find(
      (p) => p.status === "COMPLETED",
    );

    if (completedPayment) {
      throw new AppError(
        400,
        "Payment already completed for this task!",
        "DUPLICATE_PAYMENT",
        "payment",
      );
    }

    // Handle existing PENDING payment
    const pendingPayment = onlinePayments.find((p) => p.status === "PENDING");

    // Handle existing PENDING payment
    if (pendingPayment) {
      const now = new Date();
      const expiresAt = pendingPayment.sessionExpiresAt;

      // Case 1: Payment not expired yet - return existing payment
      if (expiresAt && expiresAt > now) {
        return {
          payment: {
            id: pendingPayment.id,
            transactionId: pendingPayment.transactionId,
            sessionToken: pendingPayment.sessionToken,
            amount: pendingPayment.amount,
            method: pendingPayment.method,
            status: pendingPayment.status,
            sessionExpiresAt: pendingPayment.sessionExpiresAt,
            gatewayResponse: pendingPayment.gatewayResponse,
          },
          gatewayUrl:
            (pendingPayment.gatewayResponse as any)?.GatewayPageURL || null,
          message:
            "You have a pending payment. Please complete it or wait for expiry to retry.",
          isExisting: true,
        };
      }

      // Case 2: Payment expired - mark as failed and create new one
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureReason: "Payment session expired",
        },
      });
    }

    // 3. Create new payment - generate transaction ID and session token
    const transactionId = createTnxId("TNX");
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const amount = Number(task.agreedCompensation);
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // 4. Create Payment record BEFORE calling gateway
    const payment = await prisma.payment.create({
      data: {
        transactionId,
        sessionToken,
        taskId,
        payerId: userId,
        payeeId: task.approvedApplication.applicantId,
        amount,
        method: "ONLINE",
        commissionRate,
        commissionAmount,
        sessionExpiresAt,
        metadata: {
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    // 5. Prepare SSLCommerz data
    const sslcommerzData = {
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: amount,
      currency: "BDT",
      tran_id: transactionId,
      success_url: `${successUrl}?sessionToken=${sessionToken}`,
      fail_url: `${failUrl}?sessionToken=${sessionToken}`,
      cancel_url: `${cancelUrl}?sessionToken=${sessionToken}`,
      ipn_url:
        config.sslcommerz.ipnUrl || `${config.appUrl}/api/v1/payment/ipn`,

      // Product info
      product_name: `Task Payment - ${task.title}`,
      product_category: task.category,
      product_profile: "service",

      // Customer info (payer - task poster)
      cus_name: task.postedBy.name,
      cus_email: task.postedBy.email,
      cus_add1: task.postedBy.address || "N/A",
      cus_add2: task.location,
      cus_city: task.location,
      cus_state: "N/A",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: task.postedBy.phone || "",
      cus_fax: task.postedBy.phone || "",

      // Shipping info (payee - task doer)
      shipping_method: "N/A",
      ship_name: task.approvedApplication.applicant.name,
      ship_add1: task.location,
      ship_add2: task.location,
      ship_city: task.location,
      ship_state: "Bangladesh",
      ship_postcode: "1000",
      ship_country: "Bangladesh",
    };

    // 6. Call SSLCommerz API
    const response = await axios({
      method: "post",
      url: gatewayBaseUrl,
      data: sslcommerzData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // 7. Check if gateway initialization was successful
    if (response.data.status !== "SUCCESS") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: "Gateway initialization failed",
          gatewayResponse: response.data,
        },
      });

      throw new AppError(
        500,
        "Failed to initialize payment gateway",
        "GATEWAY_INIT_FAILED",
        "payment",
      );
    }

    // 8. Update payment with gateway response
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayTransactionId: response.data.sessionkey || null,
        gatewayResponse: response.data,
      },
      select: {
        id: true,
        transactionId: true,
        sessionToken: true,
        amount: true,
        method: true,
        status: true,
        sessionExpiresAt: true,
        gatewayResponse: true,
      },
    });

    // 9. Return payment details and redirect URL
    return {
      payment: updatedPayment,
      gatewayUrl: response.data.GatewayPageURL,
      message: "Payment initiated successfully. Redirect to gateway.",
      isExisting: false,
    };
  } catch (error) {
    console.error("Error in onlinePaymentInitService:", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      500,
      "Failed to initiate online payment",
      "PAYMENT_INIT_FAILED",
      "payment",
    );
  }
};

// validate online payment service
const validateOnlinePaymentService = async (payload: IpnQuery) => {
  try {
    if (!payload || !payload.tran_id || !payload.status || !payload.val_id) {
      throw new AppError(400, "Invalid IPN payload", "INVALID_PAYLOAD", "ipn");
    }
    if (payload.status !== "VALID") {
      throw new AppError(400, "Payment not valid", "PAYMENT_INVALID", "ipn");
    }
    const response = await axios({
      method: "GET",
      url: `${config.sslcommerz.validationApiUrl}?val_id=${payload.val_id}&store_id=${config.sslcommerz.storeId}&store_passwd=${config.sslcommerz.storePassword}&format=json`,
    });

    if (
      response.data.status !== "VALID" &&
      response.data.status !== "VALIDATED"
    ) {
      throw new AppError(
        400,
        "Payment validation failed",
        "PAYMENT_VALIDATION_FAILED",
        "ipn",
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
        Number(updatedPayment.amount) * commissionRate;

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
          sessionToken: true,
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

// get all payment made by user
const getAllPaymentMadeService = async (userId: string) => {
  try {
    const paymentsMade = await prisma.payment.findMany({
      where: { payerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionId: true,
        amount: true,
        method: true,
        status: true,
        cashStatus: true,
        paidAt: true,
        createdAt: true,
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskId: true,
      },
    });
    if (!paymentsMade || paymentsMade.length === 0) {
      throw new AppError(404, "No payments made found");
    }
    return paymentsMade;
  } catch (error) {
    console.error("Error in getAllPaymentMadeService:", error);
    throw error;
  }
};

// get all payment received by user
const getAllPaymentReceivedService = async (userId: string) => {
  try {
    const paymentsReceived = await prisma.payment.findMany({
      where: { payeeId: userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionId: true,
        amount: true,
        method: true,
        status: true,
        cashStatus: true,
        paidAt: true,
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        commissionAmount: true,
        commissionDeducted: true,
        createdAt: true,
        taskId: true,
      },
    });
    if (!paymentsReceived || paymentsReceived.length === 0) {
      throw new AppError(404, "No received payments found");
    }
    return paymentsReceived;
  } catch (error) {
    console.error("Error in getAllPaymentReceivedService:", error);
    throw error;
  }
};
const getPaymentByIdService = async (paymentId: string, userId: string) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        OR: [{ payerId: userId }, { payeeId: userId }],
      },

      select: {
        id: true,
        transactionId: true,
        amount: true,
        method: true,
        status: true,
        cashStatus: true,
        paidAt: true,
        createdAt: true,

        task: {
          select: {
            title: true,
            category: true,
            location: true,
            status: true,
          },
        },

        payer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        payee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        failedAt: true,
        failureReason: true,
        commissionAmount: true,
        commissionDeducted: true,
      },
    });
    if (!payment) {
      throw new AppError(404, "Payment not found", "NOT_FOUND", "payment");
    }
    return payment;
  } catch (error) {
    console.error("Error in getPaymentDetailsService:", error);
    throw error;
  }
};
const getPaymentBySessionTokenService = async (
  sessionToken: string,
  userId: string,
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      sessionToken,
      payerId: userId,
    },
    select: {
      id: true,
      transactionId: true,
      amount: true,
      method: true,
      status: true,
      sessionToken: true,
      sessionExpiresAt: true,
      paidAt: true,
      failedAt: true,
      failureReason: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          status: true,
        },
      },
      payer: { select: { id: true, name: true, email: true } },
      payee: { select: { id: true, name: true, email: true } },
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment not found", "NOT_FOUND", "payment");
  }

  return payment;
};

const paymentFailService = async (data: IpnQuery) => {
  const payment = await prisma.payment.findFirst({
    where: { transactionId: data.tran_id },
    select: { id: true, status: true },
  });

  if (!payment) {
    throw new AppError(404, "Payment record not found", "NOT_FOUND", "payment");
  }

  if (payment.status === "COMPLETED") {
    return payment;
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason: data.error ?? "Payment failed",
      gatewayResponse: data as object,
    },
    select: { id: true, transactionId: true, status: true, failedAt: true },
  });
};

const paymentCancelService = async (data: IpnQuery) => {
  const payment = await prisma.payment.findFirst({
    where: { transactionId: data.tran_id },
    select: { id: true, status: true },
  });

  if (!payment) {
    throw new AppError(404, "Payment record not found", "NOT_FOUND", "payment");
  }

  if (payment.status === "COMPLETED") {
    return payment;
  }

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "CANCELLED",
      gatewayResponse: data as object,
    },
    select: { id: true, transactionId: true, status: true },
  });
};

export {
  cashPaymentConfirmService,
  cashPaymentDeclineService,
  cashPaymentInitService,
  getAllPaymentMadeService,
  getAllPaymentReceivedService,
  getPaymentByIdService,
  getPaymentBySessionTokenService,
  onlinePaymentInitService,
  paymentCancelService,
  paymentFailService,
  validateOnlinePaymentService,
};
