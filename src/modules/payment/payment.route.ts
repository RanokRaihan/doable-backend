import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import {
  cashPaymentConfirmController,
  cashPaymentDeclineController,
  cashPaymentInitController,
  onlinePaymentInitController,
} from "./payment.controller";

const router = Router();

router.post(
  "/online/init/:taskId",
  auth,
  authorize(["USER"]),
  onlinePaymentInitController
);
router.post(
  "/cash/init/:taskId",
  auth,
  authorize(["USER"]),
  cashPaymentInitController
);
router.patch(
  "/cash/confirm/:paymentId",
  auth,
  authorize(["USER"]),
  cashPaymentConfirmController
);
router.patch(
  "/cash/decline/:paymentId",
  auth,
  authorize(["USER"]),
  cashPaymentDeclineController
);

export default router;
