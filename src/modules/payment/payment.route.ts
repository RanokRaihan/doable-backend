import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  getAllPaymentMadeController,
  getAllPaymentReceivedController,
  getPaymentByIdController,
  onlinePaymentInitController,
  paymentSuccessController,
  validateOnlinePaymentController,
} from "./payment.controller";

const router = Router();

router.post(
  "/cash/init/:taskId",
  auth,
  authorize(["USER"]),
  cashPaymentInitController,
);
router.post("/success", paymentSuccessController);

router.patch(
  "/cash/confirm/:paymentId",
  auth,
  authorize(["USER"]),
  cashPaymentConfirmController,
);
router.patch(
  "/cash/decline/:paymentId",
  auth,
  authorize(["USER"]),
  cashPaymentDeclineController,
);
router.post(
  "/online/init/:taskId",
  auth,
  authorize(["USER"]),
  onlinePaymentInitController,
);
router.post("/online/ipn-validate/", validateOnlinePaymentController);

// get payment history for user
router.get(
  "/user/payment-made",
  auth,
  authorize(["USER"]),
  getAllPaymentMadeController,
);

router.get(
  "/user/payment-received",
  auth,
  authorize(["USER"]),
  getAllPaymentReceivedController,
);
router.get("/:id", auth, authorize(["USER"]), getPaymentByIdController);

export default router;
