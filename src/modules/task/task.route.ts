import { UserRole } from "@prisma/client";
import { Router } from "express";
import { auth, optionalAuth } from "../../middlewares/authMiddleware";
import { authorize } from "../../middlewares/authorizeMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import {
  addTaskImagesController,
  approveTaskCompletionController,
  createTaskController,
  deleteTaskController,
  deleteTaskImageController,
  getAllMyTasksController,
  getMyPostedTaskController,
  getRecentlyPostedTasksController,
  getTaskByIdController,
  getTasksController,
  markTaskAsInProgressController,
  markTaskCompletedController,
  requestTaskRevisionController,
  updateTaskController,
  updateTaskImagesController,
} from "./task.controller";
import {
  addTaskImagesSchema,
  createTaskSchema,
  deleteTaskImageSchema,
  getAllMyTasksSchema,
  getAllTasksSchema,
  getMyPostedTaskSchema,
  updateTaskImagesSchema,
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

// add images to task
router.post(
  "/:taskId/image",
  auth,
  authorize([UserRole.USER]),
  validateRequest(addTaskImagesSchema),
  addTaskImagesController,
);

// update images of a task
router.patch(
  "/:taskId/image",
  auth,
  authorize([UserRole.USER]),
  validateRequest(updateTaskImagesSchema),
  updateTaskImagesController,
);

// delete a single image from a task
router.delete(
  "/:taskId/image/:imageId",
  auth,
  authorize([UserRole.USER]),
  validateRequest(deleteTaskImageSchema),
  deleteTaskImageController,
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

// Get all tasks posted by the current user
router.get(
  "/my-posted-tasks",
  auth,
  authorize([UserRole.USER]),
  validateRequest(getAllMyTasksSchema),
  getAllMyTasksController,
);

// Get specific task posted by the current user
router.get(
  "/my-posted-task/:taskId",
  auth,
  authorize([UserRole.USER]),
  validateRequest(getMyPostedTaskSchema),
  getMyPostedTaskController,
);

// public routes
router.get(
  "/all-task",
  optionalAuth,
  validateRequest(getAllTasksSchema),
  getTasksController,
);
router.get(
  "/recently-posted",
  optionalAuth,
  getRecentlyPostedTasksController,
);
router.get("/:id", getTaskByIdController);

// Export the router to be used in the main application
export default router;
