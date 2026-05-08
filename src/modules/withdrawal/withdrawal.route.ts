import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  cancelWithdrawalRequestController,
  createWithdrawalMethodController,
  createWithdrawalRequestController,
  deleteWithdrawalMethodController,
  editWithdrawalRequestController,
  getMyWithdrawalMethodsController,
  getMyWithdrawalRequestsController,
  getWithdrawalMethodByIdController,
  getWithdrawalRequestByIdController,
  setDefaultWithdrawalMethodController,
  updateWithdrawalMethodController,
} from "./withdrawal.controller";
import {
  cancelWithdrawalRequestSchema,
  createWithdrawalMethodSchema,
  createWithdrawalRequestSchema,
  deleteWithdrawalMethodSchema,
  editWithdrawalRequestSchema,
  getWithdrawalMethodByIdSchema,
  getWithdrawalRequestByIdSchema,
  setDefaultWithdrawalMethodSchema,
  updateWithdrawalMethodSchema,
} from "./withdrawal.validator";

const router = Router();

// ─── WithdrawalMethod Routes ──────────────────────────────────────────────────
router.post(
  "/my-methods",
  auth,
  authorize(["USER"]),
  validateRequest(createWithdrawalMethodSchema),
  createWithdrawalMethodController,
);
router.get(
  "/my-methods",
  auth,
  authorize(["USER"]),
  getMyWithdrawalMethodsController,
);
router.get(
  "/my-methods/:id",
  auth,
  authorize(["USER"]),
  validateRequest(getWithdrawalMethodByIdSchema),
  getWithdrawalMethodByIdController,
);
// set-default must be registered before plain /:id to avoid route collision
router.patch(
  "/my-methods/:id/set-default",
  auth,
  authorize(["USER"]),
  validateRequest(setDefaultWithdrawalMethodSchema),
  setDefaultWithdrawalMethodController,
);
router.patch(
  "/my-methods/:id",
  auth,
  authorize(["USER"]),
  validateRequest(updateWithdrawalMethodSchema),
  updateWithdrawalMethodController,
);
router.delete(
  "/my-methods/:id",
  auth,
  authorize(["USER"]),
  validateRequest(deleteWithdrawalMethodSchema),
  deleteWithdrawalMethodController,
);

// ─── WithdrawalRequest Routes ─────────────────────────────────────────────────
router.post(
  "/my-requests",
  auth,
  authorize(["USER"]),
  validateRequest(createWithdrawalRequestSchema),
  createWithdrawalRequestController,
);
router.get(
  "/my-requests",
  auth,
  authorize(["USER"]),
  getMyWithdrawalRequestsController,
);
router.get(
  "/my-requests/:id",
  auth,
  authorize(["USER"]),
  validateRequest(getWithdrawalRequestByIdSchema),
  getWithdrawalRequestByIdController,
);
// cancel must be registered before plain /:id PATCH to avoid route collision
router.patch(
  "/my-requests/:id/cancel",
  auth,
  authorize(["USER"]),
  validateRequest(cancelWithdrawalRequestSchema),
  cancelWithdrawalRequestController,
);
router.patch(
  "/my-requests/:id",
  auth,
  authorize(["USER"]),
  validateRequest(editWithdrawalRequestSchema),
  editWithdrawalRequestController,
);

export default router;
