import { UserRole } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  approveTaskCompletionController,
  createTaskController,
  deleteTaskController,
  getTaskByIdController,
  getTasksController,
  markTaskAsInProgressController,
  markTaskCompletedController,
  requestTaskRevisionController,
  updateTaskController,
} from "./task.controller";
import {
  createTaskSchema,
  getAllTasksSchema,
  updateTaskSchema,
} from "./task.validator";

// Defines task-related API routes
const router = Router();

router.post(
  "/post-task",
  auth,
  authorize([UserRole.USER]),
  validateRequest(createTaskSchema),
  createTaskController,
);
router.patch(
  "/update-task/:id",
  auth,
  authorize([UserRole.USER]),
  validateRequest(updateTaskSchema),
  updateTaskController,
);
router.delete(
  "/delete-task/:id",
  auth,
  authorize([UserRole.USER]),
  deleteTaskController,
);

//task completion routes
// mark in progress. (applicant starts working on task)
router.patch(
  "/:taskId/mark-in-progress",
  auth,
  authorize([UserRole.USER]),
  markTaskAsInProgressController,
);
// mark completed. (applicant marks task as completed)
router.patch(
  "/:taskId/mark-completed",
  auth,
  authorize([UserRole.USER]),
  markTaskCompletedController,
);

// approve completion. (task poster approves completed task)
router.patch(
  "/:taskId/approve-completion",
  auth,
  authorize([UserRole.USER]),
  approveTaskCompletionController,
);

// request revision. (task poster requests revision)
router.patch(
  "/:taskId/request-revision",
  auth,
  authorize([UserRole.USER]),
  requestTaskRevisionController,
);

// public routes
router.get("/all-task", validateRequest(getAllTasksSchema), getTasksController);
router.get("/:id", getTaskByIdController);

// Export the router to be used in the main application
export default router;
