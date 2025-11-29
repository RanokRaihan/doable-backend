import { RequestHandler } from "express";
import { asyncHandler } from "../../utils";

const onlinePaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {}
);
const cashPaymentInitController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { taskId } = req.params;
    const user = req.user;
    if (!user || !user.id) {
      throw new Error("Unauthorized");
    }
  }
);
const cashPaymentConfirmController: RequestHandler = asyncHandler(
  async (req, res) => {}
);
const cashPaymentDeclineController: RequestHandler = asyncHandler(
  async (req, res) => {}
);

export {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  onlinePaymentInitController,
};
