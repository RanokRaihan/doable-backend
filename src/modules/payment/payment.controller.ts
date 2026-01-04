import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { dummyValidateOnlinePaymentService } from "./payment.dummy.service";
import { IpnQuery } from "./payment.interface";
import {
  cashPaymentConfirmService,
  cashPaymentDeclineService,
  cashPaymentInitService,
  getAllPaymentMadeService,
  getAllPaymentReceivedService,
  getPaymentByIdService,
  onlinePaymentInitService,
} from "./payment.service";

const cashPaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { taskId } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const payment = await cashPaymentInitService(user.id, taskId);
    sendResponse(res, 201, "Payment initiated successfully", payment);
  }
);
const cashPaymentConfirmController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { paymentId } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }
    const payment = await cashPaymentConfirmService(user.id, paymentId);
    sendResponse(res, 200, "Payment confirmed successfully", payment);
  }
);
const cashPaymentDeclineController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { paymentId } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }
    const payment = await cashPaymentDeclineService(user.id, paymentId);
    sendResponse(res, 200, "Payment declined successfully", payment);
  }
);
const onlinePaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { taskId } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
    if (!taskId) {
      throw new Error("Task ID is required");
    }
    const response = await onlinePaymentInitService(user.id, taskId);
    sendResponse(res, 201, response.message, response);
  }
);

const validateOnlinePaymentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = req.query;

    // Map and cast req.query to IpnQuery type
    const ipnQuery: IpnQuery = {
      amount: Number(query.amount),
      bank_tran_id: query.bank_tran_id as string,
      status: query.status as string,
      val_id: query.val_id as string,
      // Add other fields from IpnQuery if needed
      ...query,
    };

    // const response = await validateOnlinePaymentService(ipnQuery);

    // Using dummy service for now. Replace with actual service later.
    const response = await dummyValidateOnlinePaymentService(ipnQuery);
    sendResponse(res, 200, "Payment validated successfully", response);
  }
);

// get all payment made by user
const getAllPaymentMadeController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "Unauthorized");
    }
    const allPaymentMade = await getAllPaymentMadeService(user.id);

    sendResponse(res, 200, "Fetched all payments made by user", allPaymentMade);
  }
);

// get all payment received by user
const getAllPaymentReceivedController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "Unauthorized");
    }
    const allPaymentReceived = await getAllPaymentReceivedService(user.id);

    sendResponse(
      res,
      200,
      "Fetched all payments received by user",
      allPaymentReceived
    );
  }
);

const getPaymentByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
    if (!id) {
      throw new Error("Payment ID is required");
    }
    const payment = await getPaymentByIdService(id, user.id);

    // Implementation to get payment by ID goes here
    sendResponse(res, 200, "Payment fetched successfully", payment);
  }
);

export {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  getAllPaymentMadeController,
  getAllPaymentReceivedController,
  getPaymentByIdController,
  onlinePaymentInitController,
  validateOnlinePaymentController,
};
