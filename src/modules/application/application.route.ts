import { UserRole } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  approveApplicationController,
  createApplicationController,
  getAllApplicationsForTaskController,
  getAllMyApplicationsController,
  getApplicationByIdController,
  rejectApplicationController,
  withdrawApplicationController,
} from "./application.controller";
import {
  createApplicationSchema,
  getAllMyApplicationsSchema,
  rejectApplicationSchema,
  withdrawApplicationSchema,
} from "./application.validation";

const router = Router();

router.post(
  "/:taskId",
  auth,
  authorize([UserRole.USER]),
  validateRequest(createApplicationSchema),
  createApplicationController,
);

// get all my application
router.get(
  "/my-applications",
  auth,
  authorize([UserRole.USER]),
  validateRequest(getAllMyApplicationsSchema),
  getAllMyApplicationsController,
);

// get all application for a task
router.get(
  "/task/:taskId",
  auth,
  authorize([UserRole.USER]),
  getAllApplicationsForTaskController,
);

// get application by id
router.get(
  "/:applicationId",
  auth,
  authorize([UserRole.USER]),
  getApplicationByIdController,
);

// update application status (for task owner)
// approve application
router.patch(
  "/approve/:applicationId",
  auth,
  authorize([UserRole.USER]),
  approveApplicationController,
);
// reject application
router.patch(
  "/reject/:applicationId",
  auth,
  authorize([UserRole.USER]),
  validateRequest(rejectApplicationSchema),
  rejectApplicationController,
);

// withdraw application (for applicant)
router.patch(
  "/withdraw/:applicationId",
  auth,
  authorize([UserRole.USER]),
  validateRequest(withdrawApplicationSchema),
  withdrawApplicationController,
);

export default router;
