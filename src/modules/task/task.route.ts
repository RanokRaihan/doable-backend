import { UserRole } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import { createTaskController } from "./task.controller";
import { createTaskSchema } from "./task.validator";

// Defines task-related API routes
const router = Router();

router.post(
  "/post-task",
  auth,
  authorize([UserRole.USER]),
  validateRequest(createTaskSchema),
  createTaskController
);

export default router;
