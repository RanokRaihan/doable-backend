import { RequestHandler } from "express";
import config from "../../config";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { parseQuery } from "../../utils/query";
import { IpnQuery } from "./payment.interface";
import {
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
  },
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
  },
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
  },
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
  },
);

const validateOnlinePaymentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = req.query;

    // Map and cast req.query to IpnQuery type
    const ipnQuery: IpnQuery = {
      tran_id: query.tran_id as string,
      amount: Number(query.amount),
      bank_tran_id: query.bank_tran_id as string,
      status: query.status as string,
      val_id: query.val_id as string,
      // Add other fields from IpnQuery if needed
      ...query,
    };

    const response = await validateOnlinePaymentService(ipnQuery);

    // Using dummy service for now. Replace with actual service later.
    // const response = await dummyValidateOnlinePaymentService(ipnQuery);
    sendResponse(res, 200, "Payment validated successfully", response);
  },
);

// get all payment made by user
const getAllPaymentMadeController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "Unauthorized");
    }
    const parsedQuery = parseQuery(req);
    const allPaymentMade = await getAllPaymentMadeService(user.id, parsedQuery);
    sendResponse(res, 200, "Fetched all payments made by user", allPaymentMade);
  },
);

// get all payment received by user
const getAllPaymentReceivedController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "Unauthorized");
    }
    const parsedQuery = parseQuery(req);
    const allPaymentReceived = await getAllPaymentReceivedService(
      user.id,
      parsedQuery,
    );
    sendResponse(
      res,
      200,
      "Fetched all payments received by user",
      allPaymentReceived,
    );
  },
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
  },
);

const paymentSuccessController: RequestHandler = asyncHandler(
  async (req, res) => {
    const data: IpnQuery = req.body;
    if (!data || !data.tran_id || !data.val_id) {
      res.redirect(config.sslcommerz.failUrlFrontend);
    }
    const sessionToken = req.query?.sessionToken;
    const finalPayment = await validateOnlinePaymentService(data);
    if (!finalPayment || finalPayment.status !== "COMPLETED") {
      return res.redirect(config.sslcommerz.failUrlFrontend);
    }
    res.redirect(
      `${config.sslcommerz.successUrlFrontend}?sessionToken=${sessionToken}`,
    );
  },
);

const paymentFailController: RequestHandler = asyncHandler(async (req, res) => {
  const data: IpnQuery = req.body;
  const sessionToken = req.query?.sessionToken;
  if (data?.tran_id) {
    await paymentFailService(data);
  }
  res.redirect(
    `${config.sslcommerz.failUrlFrontend}?sessionToken=${sessionToken}`,
  );
});

const paymentCancelController: RequestHandler = asyncHandler(
  async (req, res) => {
    const data: IpnQuery = req.body;
    const sessionToken = req.query?.sessionToken;
    if (data?.tran_id) {
      await paymentCancelService(data);
    }
    res.redirect(
      `${config.sslcommerz.cancelUrlFrontend}?sessionToken=${sessionToken}`,
    );
  },
);

const getPaymentBySessionTokenController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { sessionToken } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!sessionToken) {
      throw new AppError(400, "Session token is required");
    }
    const payment = await getPaymentBySessionTokenService(
      sessionToken,
      user.id,
    );
    sendResponse(res, 200, "Payment fetched successfully", payment);
  },
);

export {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  getAllPaymentMadeController,
  getAllPaymentReceivedController,
  getPaymentByIdController,
  getPaymentBySessionTokenController,
  onlinePaymentInitController,
  paymentCancelController,
  paymentFailController,
  paymentSuccessController,
  validateOnlinePaymentController,
};
