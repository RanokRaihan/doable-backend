import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { CreateTaskRequest, UpdateTaskPayload } from "./task.interface";
import {
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  getTasksService,
  updateTaskService,
} from "./task.service";

const createTaskController: RequestHandler = asyncHandler(async (req, res) => {
  const taskData: CreateTaskRequest = req.body;
  const user = req.user;
  if (!user || !user.id) {
    throw new AppError(401, "Unauthorized");
  }
  const taskPayload = { ...taskData, postedById: user.id };
  const result = await createTaskService(taskPayload);
  sendResponse(res, 201, "Task created successfully!", result);
});

const getTasksController: RequestHandler = asyncHandler(async (_req, res) => {
  const result = await getTasksService();
  sendResponse(res, 200, "Tasks retrieved successfully!", result);
});

const getTaskByIdController: RequestHandler = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  if (!taskId) {
    throw new AppError(400, "Task ID is required");
  }

  const result = await getTaskByIdService(taskId);
  sendResponse(res, 200, "Task retrieved successfully!", result);
});

const updateTaskController: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.user;
  const taskId = req.params.id;
  const taskData: UpdateTaskPayload = req.body;
  if (!user || !user.id) {
    throw new AppError(401, "Unauthorized");
  }
  if (!taskId) {
    throw new AppError(400, "Task ID is required");
  }
  const result = await updateTaskService(taskId, user.id, taskData);
  sendResponse(res, 200, "Task updated successfully!", result);
});

const deleteTaskController: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.user;
  const taskId = req.params.id;
  if (!user || !user.id) {
    throw new AppError(401, "Unauthorized");
  }
  if (!taskId) {
    throw new AppError(400, "Task ID is required");
  }
  await deleteTaskService(taskId, user.id);
  sendResponse(res, 200, "Task deleted successfully!", null);
});

export {
  createTaskController,
  deleteTaskController,
  getTaskByIdController,
  getTasksController,
  updateTaskController,
};
