import { RequestHandler } from "express";
import { asyncHandler, sendResponse } from "../../utils";
import { parseQuery } from "../../utils/query";
import {
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
} from "./withdrawal.service";

// ─── WithdrawalMethod Controllers ────────────────────────────────────────────

const createWithdrawalMethodController: RequestHandler = asyncHandler(
  async (req, res) => {
    const method = await createWithdrawalMethodService(req.user!.id, req.body);
    sendResponse(res, 201, "Withdrawal method created successfully", method);
  },
);

const getMyWithdrawalMethodsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await getMyWithdrawalMethodsService(req.user!.id);
    sendResponse(res, 200, "Withdrawal methods fetched successfully", result);
  },
);

const getWithdrawalMethodByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const method = await getWithdrawalMethodByIdService(
      req.user!.id,
      req.params["id"]!,
    );
    sendResponse(res, 200, "Withdrawal method fetched successfully", method);
  },
);

const updateWithdrawalMethodController: RequestHandler = asyncHandler(
  async (req, res) => {
    const method = await updateWithdrawalMethodService(
      req.user!.id,
      req.params["id"]!,
      req.body,
    );
    sendResponse(res, 200, "Withdrawal method updated successfully", method);
  },
);

const setDefaultWithdrawalMethodController: RequestHandler = asyncHandler(
  async (req, res) => {
    const method = await setDefaultWithdrawalMethodService(
      req.user!.id,
      req.params["id"]!,
    );
    sendResponse(
      res,
      200,
      "Default withdrawal method set successfully",
      method,
    );
  },
);

const deleteWithdrawalMethodController: RequestHandler = asyncHandler(
  async (req, res) => {
    const method = await deleteWithdrawalMethodService(
      req.user!.id,
      req.params["id"]!,
    );
    sendResponse(res, 200, "Withdrawal method deleted successfully", method);
  },
);

// ─── WithdrawalRequest Controllers ───────────────────────────────────────────

const createWithdrawalRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const request = await createWithdrawalRequestService(
      req.user!.id,
      req.body,
    );
    sendResponse(res, 201, "Withdrawal request created successfully", request);
  },
);

const getMyWithdrawalRequestsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const parsedQuery = parseQuery(req);
    const result = await getMyWithdrawalRequestsService(
      req.user!.id,
      parsedQuery,
    );
    sendResponse(res, 200, "Withdrawal requests fetched successfully", result);
  },
);

const getWithdrawalRequestByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const request = await getWithdrawalRequestByIdService(
      req.user!.id,
      req.params["id"]!,
    );
    sendResponse(res, 200, "Withdrawal request fetched successfully", request);
  },
);

const editWithdrawalRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const request = await editWithdrawalRequestService(
      req.user!.id,
      req.params["id"]!,
      req.body,
    );
    sendResponse(res, 200, "Withdrawal request updated successfully", request);
  },
);

const cancelWithdrawalRequestController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { cancellationReason } = req.body as { cancellationReason: string };
    const request = await cancelWithdrawalRequestService(
      req.user!.id,
      req.params["id"]!,
      cancellationReason,
    );
    sendResponse(
      res,
      200,
      "Withdrawal request cancelled successfully",
      request,
    );
  },
);

export {
  cancelWithdrawalRequestController,
  createWithdrawalMethodController,
  createWithdrawalRequestController,
  deleteWithdrawalMethodController,
  editWithdrawalRequestController,
  getMyWithdrawalMethodsController,
  getMyWithdrawalRequestsController,
  getWithdrawalMethodByIdController,
  getWithdrawalRequestByIdController,
  setDefaultWithdrawalMethodController,
  updateWithdrawalMethodController,
};
