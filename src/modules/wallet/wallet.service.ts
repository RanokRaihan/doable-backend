import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { createTnxId } from "../../utils/createTnxId";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import {
  commissionDueFilterableFields,
  commissionDueSortableFields,
  walletTransactionFilterableFields,
  walletTransactionSortableFields,
} from "./wallet.constant";

const getMyWalletService = async (userId: string) => {
  try {
    const wallet = prisma.wallet.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    return wallet;
  } catch (error) {
    console.error("Error fetching wallet:", error);
    throw error;
  }
};
const getAllWalletTransactionsService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      include: { wallet: true },
    });
    if (!user || !user.wallet?.id) {
      throw new AppError(404, "User or wallet not found");
    }

    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      sortFields: walletTransactionSortableFields,
      filterFields: walletTransactionFilterableFields,
    });

    const mergedWhere = { ...where, walletId: user.wallet.id };

    const queryOptions: Parameters<
      typeof prisma.walletTransaction.findMany
    >[0] = { where: mergedWhere, skip, take };

    if (orderBy) {
      queryOptions.orderBy = orderBy;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.walletTransaction.findMany(queryOptions),
      prisma.walletTransaction.count({ where: mergedWhere }),
    ]);

    const meta = buildMeta(totalCount, parsedQuery.pagination);
    return { data: transactions, meta };
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    throw error;
  }
};
const getWalletTransactionByIdService = async (
  userId: string,
  tnxId: string,
) => {
  try {
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: tnxId },
      include: { wallet: true },
    });
    if (!transaction) {
      throw new AppError(404, "Wallet transaction not found");
    }
    if (transaction.wallet.userId !== userId) {
      throw new AppError(
        403,
        "You are not authorized to view this transaction",
      );
    }
    return transaction;
  } catch (error) {
    console.error("Error fetching wallet transaction by ID:", error);
    throw error;
  }
};
const getAllCommissionsDueService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      include: { wallet: true },
    });
    if (!user || !user.wallet?.id) {
      throw new AppError(404, "User or wallet not found");
    }

    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      sortFields: commissionDueSortableFields,
      filterFields: commissionDueFilterableFields,
    });

    const mergedWhere = {
      ...where,
      walletId: user.wallet.id,
    };

    const queryOptions: Parameters<typeof prisma.commissionDue.findMany>[0] = {
      where: mergedWhere,
      skip,
      take,
    };

    if (orderBy) {
      queryOptions.orderBy = orderBy;
    }

    const [commissionsDue, totalCount] = await Promise.all([
      prisma.commissionDue.findMany(queryOptions),
      prisma.commissionDue.count({ where: mergedWhere }),
    ]);

    const meta = buildMeta(totalCount, parsedQuery.pagination);
    return { data: commissionsDue, meta };
  } catch (error) {
    console.error("Error fetching commissions due:", error);
    throw error;
  }
};
const getCommissionDueByIdService = async (userId: string, dueId: string) => {
  try {
    const commissionDue = await prisma.commissionDue.findUnique({
      where: { id: dueId },
      include: {
        wallet: true,
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            baseCompensation: true,
            agreedCompensation: true,
            postedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!commissionDue) {
      throw new AppError(404, "Commission due not found");
    }
    if (commissionDue.wallet.userId !== userId) {
      throw new AppError(
        403,
        "You are not authorized to view this commission due",
      );
    }
    return commissionDue;
  } catch (error) {
    console.error("Error fetching commission due by ID:", error);
    throw error;
  }
};
const payCommissionDueService = async (userId: string, dueId: string) => {
  try {
    const commissionDue = await prisma.commissionDue.findUnique({
      where: { id: dueId },
      include: { wallet: true, task: true },
    });
    if (!commissionDue) {
      throw new AppError(404, "Commission due not found");
    }
    if (commissionDue.wallet.userId !== userId) {
      throw new AppError(
        403,
        "You are not authorized to pay this commission due",
      );
    }
    if (commissionDue.status === "PAID") {
      throw new AppError(400, "Commission due is already paid");
    }
    if (Number(commissionDue.wallet.balance) < Number(commissionDue.amount)) {
      throw new AppError(
        400,
        "Insufficient wallet balance to pay commission due",
      );
    }
    const payment = await prisma.payment.findFirst({
      where: { taskId: commissionDue.taskId, status: "COMPLETED" },
    });
    if (!payment) {
      throw new AppError(
        400,
        "Cannot pay commission due as the associated task payment is not completed",
      );
    }

    const updatedCommisionDue = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: commissionDue.walletId },
        data: {
          balance: {
            decrement: commissionDue.amount,
          },
        },
      });
      const walletTransactionId = createTnxId("WTNX");
      const newWalletTransaction = await tx.walletTransaction.create({
        data: {
          transactionId: walletTransactionId,
          walletId: commissionDue.walletId,
          amount: commissionDue.amount,
          type: "DEBIT",
          description: `Payment for commission due ID: ${commissionDue.id}`,
          category: "DUE_COMMISSION_DEDUCTION",
          refCommissionDueId: commissionDue.id,
          balanceBefore: commissionDue.wallet.balance,
          balanceAfter: updatedWallet.balance,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          commissionDeducted: true,
        },
      });
      const updatedDue = await tx.commissionDue.update({
        where: { id: commissionDue.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidViaTxn: newWalletTransaction.id,
        },
      });
      return updatedDue;
    });
    return updatedCommisionDue;
  } catch (error) {
    console.error("Error paying commission due:", error);
    throw error;
  }
};
export {
  getAllCommissionsDueService,
  getAllWalletTransactionsService,
  getCommissionDueByIdService,
  getMyWalletService,
  getWalletTransactionByIdService,
  payCommissionDueService,
};
