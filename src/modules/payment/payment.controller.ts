import { RequestHandler } from "express";
import config from "../../config";
import { AppError, asyncHandler, ResponseHandler } from "../../utils";
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
    return ResponseHandler.created(res, "Payment initiated successfully", payment, req.path);
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
    return ResponseHandler.ok(res, "Payment confirmed successfully", payment, { path: req.path });
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
    return ResponseHandler.ok(res, "Payment declined successfully", payment, { path: req.path });
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
    return ResponseHandler.created(res, response.message, response, req.path);
  },
);

const validateOnlinePaymentController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = req.query;

    const ipnQuery: IpnQuery = {
      tran_id: query.tran_id as string,
      amount: Number(query.amount),
      bank_tran_id: query.bank_tran_id as string,
      status: query.status as string,
      val_id: query.val_id as string,
      ...query,
    };

    const response = await validateOnlinePaymentService(ipnQuery);
    return ResponseHandler.ok(res, "Payment validated successfully", response, { path: req.path });
  },
);

const getAllPaymentMadeController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(400, "Unauthorized");
    }
    const parsedQuery = parseQuery(req);
    const allPaymentMade = await getAllPaymentMadeService(user.id, parsedQuery);
    return ResponseHandler.ok(res, "Fetched all payments made by user", allPaymentMade, { path: req.path });
  },
);

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
    return ResponseHandler.ok(res, "Fetched all payments received by user", allPaymentReceived, { path: req.path });
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
    return ResponseHandler.ok(res, "Payment fetched successfully", payment, { path: req.path });
  },
);

// ISSUE-005: added `return` to prevent execution continuing past the early redirect
const paymentSuccessController: RequestHandler = asyncHandler(
  async (req, res) => {
    const data: IpnQuery = req.body;
    if (!data || !data.tran_id || !data.val_id) {
      return res.redirect(config.sslcommerz.failUrlFrontend);
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
    return ResponseHandler.ok(res, "Payment fetched successfully", payment, { path: req.path });
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
