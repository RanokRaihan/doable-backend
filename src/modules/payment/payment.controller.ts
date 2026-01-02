import { RequestHandler } from "express";
import { asyncHandler, sendResponse } from "../../utils";
import { dummyValidateOnlinePaymentService } from "./payment.dummy.service";
import { IpnQuery } from "./payment.interface";
import {
  cashPaymentConfirmService,
  cashPaymentDeclineService,
  cashPaymentInitService,
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
    const response = await dummyValidateOnlinePaymentService(ipnQuery);
    sendResponse(res, 200, "Payment validated successfully", response);
  }
);
export {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  onlinePaymentInitController,
  validateOnlinePaymentController,
};
