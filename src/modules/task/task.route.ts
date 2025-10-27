import { UserRole } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  createTaskController,
  deleteTaskController,
  getTaskByIdController,
  getTasksController,
  updateTaskController,
} from "./task.controller";
import { createTaskSchema, updateTaskSchema } from "./task.validator";

// Defines task-related API routes
const router = Router();

router.post(
  "/post-task",
  auth,
  authorize([UserRole.USER]),
  validateRequest(createTaskSchema),
  createTaskController
);
router.patch(
  "/update-task/:id",
  auth,
  authorize([UserRole.USER]),
  validateRequest(updateTaskSchema),
  updateTaskController
);
router.delete(
  "/delete-task/:id",
  auth,
  authorize([UserRole.USER]),
  deleteTaskController
);

// public routes
router.get("/all-task", getTasksController);
router.get("/:id", getTaskByIdController);
export default router;
