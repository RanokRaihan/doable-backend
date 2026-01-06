import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import {
  getAllCommissionsDueService,
  getAllWalletTransactionsService,
  getCommissionDueByIdService,
  getMyWalletService,
  getWalletTransactionByIdService,
  payCommissionDueService,
} from "./wallet.service";

const getMyWalletController: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || !user.id) {
    throw new AppError(400, "You are not authorized to perform this action");
  }
  const wallet = await getMyWalletService(user.id);
  sendResponse(res, 200, "Wallet fetched successfully", wallet);
});

const getAllWalletTransactionsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "You are not authorized to perform this action");
    }
    const walletTransactions = await getAllWalletTransactionsService(user.id);
    sendResponse(
      res,
      200,
      "Wallet transactions fetched successfully",
      walletTransactions
    );
  }
);

const getWalletTransactionByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const { tnxId } = req.params;
    if (!user || !user.id) {
      throw new AppError(400, "You are not authorized to perform this action");
    }
    if (!tnxId) {
      throw new AppError(400, "Transaction ID is required");
    }
    const walletTransaction = await getWalletTransactionByIdService(
      user.id,
      tnxId
    );
    sendResponse(
      res,
      200,
      "Wallet transaction fetched successfully",
      walletTransaction
    );
  }
);

const getAllCommissionsDueController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "You are not authorized to perform this action");
    }
    const commissionsDue = await getAllCommissionsDueService(user.id);
    sendResponse(
      res,
      200,
      "Commissions due fetched successfully",
      commissionsDue
    );
  }
);

const getCommissionDueByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const { dueId } = req.params;
    if (!user || !user.id) {
      throw new AppError(400, "You are not authorized to perform this action");
    }
    if (!dueId) {
      throw new AppError(400, "Commission Due ID is required");
    }
    const commissionDue = await getCommissionDueByIdService(user.id, dueId);
    sendResponse(
      res,
      200,
      "Commission due fetched successfully",
      commissionDue
    );
  }
);

const payCommissionDueController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const { dueId } = req.params;
    if (!user || !user.id) {
      throw new AppError(400, "You are not authorized to perform this action");
    }
    if (!dueId) {
      throw new AppError(400, "Commission Due ID is required");
    }
    const updatedCommissionDue = await payCommissionDueService(user.id, dueId);
    sendResponse(
      res,
      200,
      "Commission due paid successfully",
      updatedCommissionDue
    );
  }
);

export {
  getAllCommissionsDueController,
  getAllWalletTransactionsController,
  getCommissionDueByIdController,
  getMyWalletController,
  getWalletTransactionByIdController,
  payCommissionDueController,
};
