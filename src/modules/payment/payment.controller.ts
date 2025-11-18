import { RequestHandler } from "express";
import { asyncHandler } from "../../utils";

const onlinePaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {}
);
const cashPaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {}
);
const cashPaymentConfirmController: RequestHandler = asyncHandler(
  async (req, res) => {}
);

export {
  cashPaymentConfirmController,
  cashPaymentInitController,
  onlinePaymentInitController,
};
