import { RequestHandler } from "express";
import { AppError, asyncHandler } from "../../utils";
import { CreateTaskRequest } from "./task.interface";
import { createTaskService } from "./task.service";
const createTaskController: RequestHandler = asyncHandler(async (req, res) => {
  const taskData: CreateTaskRequest = req.body;
  const user = req.user;
  if (!user || !user.id) {
    throw new AppError(401, "Unauthorized");
  }
  const taskPayload = { ...taskData, postedById: user.id };
  const result = await createTaskService(taskPayload);
  res.status(201).json(result);
});

export { createTaskController };
