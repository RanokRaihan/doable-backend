import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import {
  withdrawalMethodFilterableFields,
  withdrawalMethodSortableFields,
  withdrawalRequestFilterableFields,
  withdrawalRequestSortableFields,
} from "./withdrawal.constant";
import {
  ICreateWithdrawalMethodPayload,
  ICreateWithdrawalRequestPayload,
  IEditWithdrawalRequestPayload,
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

  if (payload.isDefault) {
    await prisma.withdrawalMethod.updateMany({
      where: { walletId: user.wallet.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const method = await prisma.withdrawalMethod.create({
    data: {
      walletId: user.wallet.id,
      methodType: payload.methodType,
      accountNumber: payload.accountNumber,
      accountName: payload.accountName,
      bankName: payload.bankName ?? null,
      branchName: payload.branchName ?? null,
      routingNumber: payload.routingNumber ?? null,
      isDefault: payload.isDefault ?? false,
    },
  });
  return method;
};

const getMyWithdrawalMethodsService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new AppError(404, "Wallet not found");

  const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
    sortFields: withdrawalMethodSortableFields,
    filterFields: withdrawalMethodFilterableFields,
  });

  const mergedWhere = { ...where, walletId: user.wallet.id, isActive: true };

  const queryOptions: Parameters<typeof prisma.withdrawalMethod.findMany>[0] = {
    where: mergedWhere,
    skip,
    take,
  };
  if (orderBy) queryOptions.orderBy = orderBy;

  const [methods, totalCount] = await Promise.all([
    prisma.withdrawalMethod.findMany(queryOptions),
    prisma.withdrawalMethod.count({ where: mergedWhere }),
  ]);

  return { data: methods, meta: buildMeta(totalCount, parsedQuery.pagination) };
};

const getWithdrawalMethodByIdService = async (userId: string, id: string) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to view this withdrawal method",
    );
  return method;
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

  if (payload.isDefault) {
    await prisma.withdrawalMethod.updateMany({
      where: { walletId: method.walletId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

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
      ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
    },
  });
  return updated;
};

const setDefaultWithdrawalMethodService = async (
  userId: string,
  id: string,
) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to modify this withdrawal method",
    );
  if (!method.isActive)
    throw new AppError(
      400,
      "Cannot set a deleted withdrawal method as default",
    );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.withdrawalMethod.updateMany({
      where: { walletId: method.walletId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.withdrawalMethod.update({
      where: { id },
      data: { isDefault: true },
    });
  });
  return updated;
};

const deleteWithdrawalMethodService = async (userId: string, id: string) => {
  const method = await prisma.withdrawalMethod.findUnique({
    where: { id },
    include: { wallet: true },
  });
  if (!method) throw new AppError(404, "Withdrawal method not found");
  if (method.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to delete this withdrawal method",
    );

  const pendingCount = await prisma.withdrawalRequest.count({
    where: { withdrawalMethodId: id, status: "PENDING" },
  });
  if (pendingCount > 0)
    throw new AppError(
      400,
      "Cannot delete a withdrawal method with pending requests",
    );

  const updated = await prisma.withdrawalMethod.update({
    where: { id },
    data: { isActive: false, isDefault: false },
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
  if (!method)
    throw new AppError(404, "Withdrawal method not found or inactive");

  if (Number(user.wallet.balance) < payload.amount)
    throw new AppError(400, "Insufficient wallet balance for this withdrawal");

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { balance: { decrement: payload.amount } },
    });

    const tnxId = createTnxId("WTNX");
    const walletTxn = await tx.walletTransaction.create({
      data: {
        transactionId: tnxId,
        walletId: user.wallet!.id,
        amount: payload.amount,
        type: "DEBIT",
        category: "WITHDRAWAL",
        status: "PENDING",
        description: `Withdrawal request initiated`,
        balanceBefore: user.wallet!.balance,
        balanceAfter: updatedWallet.balance,
      },
    });

    const request = await tx.withdrawalRequest.create({
      data: {
        walletId: user.wallet!.id,
        withdrawalMethodId: payload.withdrawalMethodId,
        amount: payload.amount,
        note: payload.note ?? null,
        refWalletTnxId: walletTxn.id,
      },
      include: { withdrawalMethod: true },
    });
    return request;
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
      include: { withdrawalMethod: true },
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
    include: { wallet: true, withdrawalMethod: true },
  });
  if (!request) throw new AppError(404, "Withdrawal request not found");
  if (request.wallet.userId !== userId)
    throw new AppError(
      403,
      "You are not authorized to view this withdrawal request",
    );
  return request;
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
    const available = Number(request.wallet.balance) + Number(request.amount);
    if (payload.amount > available)
      throw new AppError(
        400,
        "Insufficient wallet balance for the updated amount",
      );

    const diff = payload.amount - Number(request.amount);

    const newAmount = payload.amount;

    const updated = await prisma.$transaction(async (tx) => {
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
        include: { withdrawalMethod: true },
      });
    });
    return updated;
  }

  const updated = await prisma.withdrawalRequest.update({
    where: { id },
    data: { ...(payload.note !== undefined && { note: payload.note }) },
    include: { withdrawalMethod: true },
  });
  return updated;
};

const cancelWithdrawalRequestService = async (
  userId: string,
  id: string,
  cancellationReason?: string,
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
        cancellationReason: cancellationReason ?? null,
      },
      include: { withdrawalMethod: true },
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
