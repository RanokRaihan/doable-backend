import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import {
  withdrawalRequestFilterableFields,
  withdrawalRequestSortableFields,
} from "./withdrawal.constant";
import {
  ICreateWithdrawalMethodPayload,
  ICreateWithdrawalRequestPayload,
  IEditWithdrawalRequestPayload,
  IGetWithdrawalMethodsQuery,
  IUpdateWithdrawalMethodPayload,
} from "./withdrawal.interface";

// ─── WithdrawalMethod Services ───────────────────────────────────────────────

const createWithdrawalMethodService = async (
  userId: string,
  payload: ICreateWithdrawalMethodPayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new AppError(404, "Wallet not found");

  const methodCount = await prisma.withdrawalMethod.count({
    where: { walletId: user.wallet.id, isActive: true },
  });
  if (methodCount >= 5)
    throw new AppError(400, "You can have at most 5 withdrawal methods");

  const method = await prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.withdrawalMethod.updateMany({
        where: { walletId: user.wallet!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.withdrawalMethod.create({
      data: {
        walletId: user.wallet!.id,
        methodType: payload.methodType,
        accountNumber: payload.accountNumber,
        accountName: payload.accountName,
        bankName: payload.bankName ?? null,
        branchName: payload.branchName ?? null,
        routingNumber: payload.routingNumber ?? null,
        isDefault: payload.isDefault ?? false,
      },
      omit: { isActive: true },
    });
  });
  return method;
};

const getMyWithdrawalMethodsService = async (
  userId: string,
  query: IGetWithdrawalMethodsQuery,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new AppError(404, "Wallet not found");

  const where = {
    walletId: user.wallet.id,
    isActive: true,
    ...(query.methodType && { methodType: query.methodType }),
  };

  const queryOptions: Parameters<typeof prisma.withdrawalMethod.findMany>[0] =
    { where, omit: { isActive: true } };
  if (query.sortBy) {
    queryOptions.orderBy = { [query.sortBy]: query.sortOrder ?? "asc" };
  }

  return prisma.withdrawalMethod.findMany(queryOptions);
};

const getWithdrawalMethodByIdService = async (userId: string, id: string) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id, isActive: true },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to view this withdrawal method",
    );
  const { wallet: _wallet, ...methodWithoutWallet } = method;
  return methodWithoutWallet;
};

const updateWithdrawalMethodService = async (
  userId: string,
  id: string,
  payload: IUpdateWithdrawalMethodPayload,
) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id, isActive: true },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to update this withdrawal method",
    );

  const updated = await prisma.withdrawalMethod.update({
    where: { id },
    data: {
      ...(payload.methodType !== undefined && {
        methodType: payload.methodType,
      }),
      ...(payload.accountNumber !== undefined && {
        accountNumber: payload.accountNumber,
      }),
      ...(payload.accountName !== undefined && {
        accountName: payload.accountName,
      }),
      ...(payload.bankName !== undefined && { bankName: payload.bankName }),
      ...(payload.branchName !== undefined && {
        branchName: payload.branchName,
      }),
      ...(payload.routingNumber !== undefined && {
        routingNumber: payload.routingNumber,
      }),
    },
  });
  return updated;
};

const setDefaultWithdrawalMethodService = async (
  userId: string,
  id: string,
) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id, isActive: true },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to modify this withdrawal method",
    );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.withdrawalMethod.updateMany({
      where: { walletId: method.walletId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.withdrawalMethod.update({
      where: { id },
      data: { isDefault: true },
      omit: { isActive: true },
    });
  });
  return updated;
};

const deleteWithdrawalMethodService = async (userId: string, id: string) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id, isActive: true },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to delete this withdrawal method",
    );

  const updated = await prisma.$transaction(async (tx) => {
    const pendingCount = await tx.withdrawalRequest.count({
      where: { withdrawalMethodId: id, status: "PENDING" },
    });
    if (pendingCount > 0)
      throw new AppError(
        400,
        "Cannot delete a withdrawal method with pending requests",
      );

    return tx.withdrawalMethod.update({
      where: { id },
      data: { isActive: false, isDefault: false },
      omit: { isActive: true },
    });
  });
  return updated;
};

// ─── WithdrawalRequest Services ──────────────────────────────────────────────

const createWithdrawalRequestService = async (
  userId: string,
  payload: ICreateWithdrawalRequestPayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new AppError(404, "Wallet not found");

  const method = await prisma.withdrawalMethod.findFirst({
    where: {
      id: payload.withdrawalMethodId,
      walletId: user.wallet.id,
      isActive: true,
    },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found ");

  const result = await prisma.$transaction(async (tx) => {
    const existingPendingCount = await tx.withdrawalRequest.count({
      where: { walletId: user.wallet!.id, status: "PENDING" },
    });
    if (existingPendingCount >= 3)
      throw new AppError(
        400,
        "you already have 3 pending withdrawal requests. Please wait for them to be processed before creating new ones.",
      );
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { id: user.wallet!.id },
    });

    if (Number(wallet.balance) < payload.amount)
      throw new AppError(
        400,
        "Insufficient wallet balance for this withdrawal",
      );

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: payload.amount } },
    });

    const tnxId = createTnxId("WTNX");
    const walletTxn = await tx.walletTransaction.create({
      data: {
        transactionId: tnxId,
        walletId: wallet.id,
        amount: payload.amount,
        type: "DEBIT",
        category: "WITHDRAWAL",
        status: "PENDING",
        description: `Withdrawal request initiated`,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
      },
    });

    return tx.withdrawalRequest.create({
      data: {
        walletId: wallet.id,
        withdrawalMethodId: payload.withdrawalMethodId,
        amount: payload.amount,
        note: payload.note ?? null,
        refWalletTnxId: walletTxn.id,
      },

      select: {
        id: true,
        amount: true,
        note: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        withdrawalMethod: { omit: { isActive: true } },
      },
    });
  });
  return result;
};

const getMyWithdrawalRequestsService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new AppError(404, "Wallet not found");

  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    sortFields: withdrawalRequestSortableFields,
    filterFields: withdrawalRequestFilterableFields,
  });

  const mergedWhere = { ...where, walletId: user.wallet.id };

  const queryOptions: Parameters<typeof prisma.withdrawalRequest.findMany>[0] =
    {
      where: mergedWhere,
      skip,
      take,
      include: { withdrawalMethod: { omit: { isActive: true } } },
      omit: { rejectedBy: true },
    };
  if (orderBy) queryOptions.orderBy = orderBy;

  const [requests, totalCount] = await Promise.all([
    prisma.withdrawalRequest.findMany(queryOptions),
    prisma.withdrawalRequest.count({ where: mergedWhere }),
  ]);

  return {
    data: requests,
    meta: buildMeta(totalCount, parsedQuery.pagination),
  };
};

const getWithdrawalRequestByIdService = async (userId: string, id: string) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { wallet: true, withdrawalMethod: { omit: { isActive: true } } },
    omit: { rejectedBy: true },
  });
  if (!request) throw new AppError(404, "Withdrawal request not found");
  if (request.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to view this withdrawal request",
    );
  const { wallet: _wallet, ...requestWithoutWallet } = request;
  return requestWithoutWallet;
};

const editWithdrawalRequestService = async (
  userId: string,
  id: string,
  payload: IEditWithdrawalRequestPayload,
) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { wallet: true },
  });
  if (!request) throw new AppError(404, "Withdrawal request not found");
  if (request.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to edit this withdrawal request",
    );
  if (request.status !== "PENDING")
    throw new AppError(400, "Only PENDING withdrawal requests can be edited");

  if (
    payload.amount !== undefined &&
    payload.amount !== Number(request.amount)
  ) {
    const diff = payload.amount - Number(request.amount);
    const newAmount = payload.amount;

    const updated = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: request.walletId },
      });

      const available = Number(wallet.balance) + Number(request.amount);
      if (newAmount > available)
        throw new AppError(
          400,
          "Insufficient wallet balance for the updated amount",
        );

      const updatedWallet = await tx.wallet.update({
        where: { id: request.walletId },
        data: { balance: { decrement: diff } },
      });

      if (request.refWalletTnxId) {
        await tx.walletTransaction.update({
          where: { id: request.refWalletTnxId },
          data: {
            amount: newAmount,
            balanceAfter: updatedWallet.balance,
          },
        });
      }

      return tx.withdrawalRequest.update({
        where: { id },
        data: {
          amount: newAmount,
          ...(payload.note !== undefined && { note: payload.note }),
        },
        include: { withdrawalMethod: { omit: { isActive: true } } },
        omit: { rejectedBy: true },
      });
    });
    return updated;
  }

  const updated = await prisma.withdrawalRequest.update({
    where: { id },
    data: { ...(payload.note !== undefined && { note: payload.note }) },
    include: { withdrawalMethod: { omit: { isActive: true } } },
    omit: { rejectedBy: true },
  });
  return updated;
};

const cancelWithdrawalRequestService = async (
  userId: string,
  id: string,
  cancellationReason: string,
) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { wallet: true },
  });
  if (!request) throw new AppError(404, "Withdrawal request not found");
  if (request.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to cancel this withdrawal request",
    );
  if (request.status !== "PENDING")
    throw new AppError(
      400,
      "Only PENDING withdrawal requests can be cancelled",
    );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: request.walletId },
      data: { balance: { increment: request.amount } },
    });

    if (request.refWalletTnxId) {
      await tx.walletTransaction.update({
        where: { id: request.refWalletTnxId },
        data: { status: "CANCELLED" },
      });
    }

    return tx.withdrawalRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: cancellationReason,
      },
      include: { withdrawalMethod: { omit: { isActive: true } } },
      omit: { rejectedBy: true },
    });
  });
  return updated;
};

export {
  cancelWithdrawalRequestService,
  createWithdrawalMethodService,
  createWithdrawalRequestService,
  deleteWithdrawalMethodService,
  editWithdrawalRequestService,
  getMyWithdrawalMethodsService,
  getMyWithdrawalRequestsService,
  getWithdrawalMethodByIdService,
  getWithdrawalRequestByIdService,
  setDefaultWithdrawalMethodService,
  updateWithdrawalMethodService,
};
