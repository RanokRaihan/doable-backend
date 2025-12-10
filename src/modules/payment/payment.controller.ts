import { RequestHandler } from "express";
import { asyncHandler, sendResponse } from "../../utils";
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
export {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  onlinePaymentInitController,
};
