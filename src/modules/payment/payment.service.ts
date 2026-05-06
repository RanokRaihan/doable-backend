import axios from "axios";
import crypto from "crypto";
import config from "../../config";
import { prisma } from "../../config/database";
import { WalletTransactionCategory } from "../../generated/prisma/enums";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import {
  paymentMadeFilterableFields,
  paymentReceivedFilterableFields,
  paymentSortableFields,
} from "./payment.constant";
import { IpnQuery, PaymentPayload } from "./payment.interface";
import { getDefaultDescription } from "./payment.utils";

const commissionRate = config.commissionRate;

const cashPaymentInitService = async (userId: string, taskId: string) => {
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

  if (task.status !== "PAYMENT_PENDING") {
    throw new AppError(400, "Task is not approved for payment processing!");
  }

  if (!task.approvedApplication) {
    throw new AppError(400, "No approved application found for this task!");
  }

  const cashPayments = task.payments.find((p) => p.method === "CASH");
  if (cashPayments) {
    throw new AppError(
      400,
      "Cash payment already initiated for this task!",
      "DUPLICATE_PAYMENT",
      "payment",
    );
  }

  const onlinePayments = task.payments.filter((p) => p.method === "ONLINE");

  const completedOnlinePayment = onlinePayments.find(
    (p) => p.status === "COMPLETED" || p.status === "REFUNDED",
  );

  if (completedOnlinePayment) {
    throw new AppError(
      400,
      "Online payment already completed, refunded, or pending for this task!",
      "DUPLICATE_PAYMENT",
      "payment",
    );
  }

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

    await prisma.payment.update({
      where: { id: pendingOnlinePayment.id },
      data: {
        status: "FAILED",
        failedAt: now,
        failureReason: "Payment session expired - user switched to cash",
      },
    });
  }

  const transactionId = createTnxId("TNX");
  const amount = Number(task.agreedCompensation);
  const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

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

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
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
    await tx.task.update({
      where: { id: taskId },
      data: { status: "PAYMENT_INITIATED" },
    });
    return createdPayment;
  });

  return payment;
};

const cashPaymentConfirmService = async (userId: string, paymentId: string) => {
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

  const updatedPayment = await prisma.$transaction(async (tx) => {
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

    const wallet = await tx.wallet.findUnique({
      where: { userId: payment.payeeId },
    });

    if (!wallet) {
      throw new AppError(404, "Wallet not found for payee");
    }

    const commissionAmount =
      payment.commissionAmount || Number(payment.amount) * commissionRate;

    if (wallet.balance >= commissionAmount) {
      const updatedWallet = await tx.wallet.update({
        where: { userId: payment.payeeId },
        data: { balance: { decrement: commissionAmount } },
      });

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
};

const cashPaymentDeclineService = async (userId: string, paymentId: string) => {
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

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { cashStatus: "PAYEE_DISPUTED", payeeDeclinedAt: new Date() },
    });
    await tx.task.update({
      where: { id: payment.taskId },
      data: { status: "DISPUTED" },
    });
    return updated;
  });

  return updatedPayment;
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
  if (!task.approvedApplication?.applicantId) {
    throw new AppError(
      400,
      "No approved application found for this task!",
      "NO_APPROVED_APPLICATION",
      "task",
    );
  }
  if (task.status !== "PAYMENT_PENDING") {
    throw new AppError(
      400,
      "Task is not approved for payment processing!",
      "INVALID_TASK_STATUS",
      "task",
    );
  }

  // 2.1 Check for existing cash payments
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

  const completedPayment = onlinePayments.find(
    (p) => p.status === "COMPLETED" || p.status === "REFUNDED",
  );
  if (completedPayment) {
    throw new AppError(
      400,
      "Payment already completed or refunded for this task!",
      "DUPLICATE_PAYMENT",
      "payment",
    );
  }

  const pendingPayment = onlinePayments.find((p) => p.status === "PENDING");
  if (pendingPayment) {
    const now = new Date();
    const expiresAt = pendingPayment.sessionExpiresAt;

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

    await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        status: "FAILED",
        failedAt: now,
        failureReason: "Payment session expired",
      },
    });
  }

  // 3. Create new payment record
  const transactionId = createTnxId("TNX");
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const amount = Number(task.agreedCompensation);
  const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
  const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // 4. Create Payment record and move task to PAYMENT_INITIATED before calling gateway
  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        transactionId,
        sessionToken,
        taskId,
        payerId: userId,
        payeeId: task.approvedApplication!.applicantId,
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

    await tx.task.update({
      where: { id: taskId },
      data: { status: "PAYMENT_INITIATED" },
    });

    return createdPayment;
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
    product_name: `Task Payment - ${task.title}`,
    product_category: task.category,
    product_profile: "service",
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
    shipping_method: "N/A",
    ship_name: task.approvedApplication!.applicant.name,
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

  // 7. Gateway initialization failed — mark payment as FAILED and revert task to PAYMENT_PENDING
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

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "PAYMENT_PENDING" },
    });

    throw new AppError(
      500,
      "Failed to initialize payment gateway",
      "GATEWAY_INIT_FAILED",
      "payment",
    );
  }

  // 8. Gateway succeeded — store gateway response; task stays at PAYMENT_INITIATED
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
};

const validateOnlinePaymentService = async (payload: IpnQuery) => {
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

    const wallet = await tx.wallet.findUnique({
      where: { userId: updatedPayment.payeeId },
    });
    if (!wallet) {
      throw new AppError(404, "Wallet not found for payee");
    }

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

    await tx.wallet.update({
      where: { userId: updatedPayment.payeeId },
      data: { balance: { decrement: commissionAmount } },
    });

    const settled = await tx.payment.update({
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

    return settled;
  });

  return finalPayment;
};

const getAllPaymentMadeService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    sortFields: paymentSortableFields,
    filterFields: paymentMadeFilterableFields,
  });

  const mergedWhere = { ...where, payerId: userId };

  const queryOptions: Parameters<typeof prisma.payment.findMany>[0] = {
    where: mergedWhere,
    skip,
    take,
    select: {
      id: true,
      transactionId: true,
      amount: true,
      method: true,
      status: true,
      cashStatus: true,
      paidAt: true,
      createdAt: true,
      payee: { select: { id: true, name: true, email: true } },
      taskId: true,
    },
  };

  if (orderBy) {
    queryOptions.orderBy = orderBy;
  }

  const [paymentsMade, totalCount] = await Promise.all([
    prisma.payment.findMany(queryOptions),
    prisma.payment.count({ where: mergedWhere }),
  ]);

  const meta = buildMeta(totalCount, parsedQuery.pagination);
  return { data: paymentsMade, meta };
};

const getAllPaymentReceivedService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    sortFields: paymentSortableFields,
    filterFields: paymentReceivedFilterableFields,
  });

  const mergedWhere = { ...where, payeeId: userId, status: "COMPLETED" };

  const queryOptions: Parameters<typeof prisma.payment.findMany>[0] = {
    where: mergedWhere,
    skip,
    take,
    select: {
      id: true,
      transactionId: true,
      amount: true,
      method: true,
      status: true,
      cashStatus: true,
      paidAt: true,
      payer: { select: { id: true, name: true, email: true } },
      commissionAmount: true,
      commissionDeducted: true,
      createdAt: true,
      taskId: true,
    },
  };

  if (orderBy) {
    queryOptions.orderBy = orderBy;
  }

  const [paymentsReceived, totalCount] = await Promise.all([
    prisma.payment.findMany(queryOptions),
    prisma.payment.count({ where: mergedWhere }),
  ]);

  const meta = buildMeta(totalCount, parsedQuery.pagination);
  return { data: paymentsReceived, meta };
};

const getPaymentByIdService = async (paymentId: string, userId: string) => {
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
