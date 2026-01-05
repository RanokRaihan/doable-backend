import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import {
  getAllCommissionsDueController,
  getAllWalletTransactionsController,
  getCommissionDueByIdController,
  getMyWalletController,
  getWalletTransactionByIdController,
  payCommissionDueController,
} from "./wallet.controller";

const router = Router();

router.get("/my-wallet", auth, authorize(["USER"]), getMyWalletController);
router.get(
  "/wallet-transactions",
  auth,
  authorize(["USER"]),
  getAllWalletTransactionsController
);
router.get(
  "/wallet-transaction/:tnxId",
  auth,
  authorize(["USER"]),
  getWalletTransactionByIdController
);
router.get(
  "/commission-due",
  auth,
  authorize(["USER"]),
  getAllCommissionsDueController
);
router.get(
  "/commission-due/:dueId",
  auth,
  authorize(["USER"]),
  getCommissionDueByIdController
);
router.patch(
  "/commission-due/pay/:dueId",
  auth,
  authorize(["USER"]),
  payCommissionDueController
);

export default router;
