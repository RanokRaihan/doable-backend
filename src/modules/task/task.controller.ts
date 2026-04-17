import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { parseQuery } from "../../utils/query";
import {
  AddTaskImagesRequest,
  CreateTaskRequest,
  UpdateTaskImagesRequest,
  UpdateTaskPayload,
} from "./task.interface";
import {
  addTaskImagesService,
  approveTaskCompletionService,
  createTaskService,
  deleteTaskImageService,
  deleteTaskService,
  getAllMyTasksService,
  getTaskByIdService,
  getTasksService,
  markTaskAsCompletedService,
  markTaskAsInProgressService,
  requestTaskRevisionService,
  updateTaskImagesService,
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

const getTasksController: RequestHandler = asyncHandler(async (req, res) => {
  const parsedQuery = parseQuery(req, { maxLimit: 50, defaultLimit: 10 });
  const { data, meta } = await getTasksService(parsedQuery);
  sendResponse(res, 200, "Tasks retrieved successfully!", data, meta);
});

const getTaskByIdController: RequestHandler = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  if (!taskId) {
    throw new AppError(400, "Task ID is required");
  }

  const result = await getTaskByIdService(taskId);
  sendResponse(res, 200, "Task retrieved successfully!", result);
});

const getAllMyTasksController: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }

  const parsedQuery = parseQuery(req, { maxLimit: 50, defaultLimit: 10 });
  const { data, meta } = await getAllMyTasksService(userId, parsedQuery);
  sendResponse(res, 200, "Your tasks retrieved successfully!", data, meta);
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

// task in-progress controllers
const markTaskAsInProgressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }
    await markTaskAsInProgressService(taskId, user.id);
    sendResponse(res, 200, "Task marked as in progress successfully!", null);
  },
);

// task completion controllers
const markTaskCompletedController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }
    await markTaskAsCompletedService(taskId, user.id);
    sendResponse(res, 200, "Task marked as completed successfully!", null);
  },
);

const approveTaskCompletionController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }
    await approveTaskCompletionService(taskId, user.id);
    sendResponse(res, 200, "Task approved successfully!", null);
  },
);

const requestTaskRevisionController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }
    await requestTaskRevisionService(taskId, user.id);
    sendResponse(res, 200, "Task revision requested successfully!", null);
  },
);

const addTaskImagesController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    const { images }: AddTaskImagesRequest = req.body;

    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }

    const result = await addTaskImagesService(taskId, user.id, images);
    sendResponse(res, 201, "Images added to task successfully!", result);
  },
);

const updateTaskImagesController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    const { keepImageIds, newImages }: UpdateTaskImagesRequest = req.body;

    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId) {
      throw new AppError(400, "Task ID is required");
    }

    const result = await updateTaskImagesService(
      taskId,
      user.id,
      keepImageIds,
      newImages,
    );
    sendResponse(res, 200, "Task images updated successfully!", result);
  },
);
const deleteTaskImageController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    const taskId = req.params.taskId;
    const imageId = req.params.imageId;

    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    if (!taskId || !imageId) {
      throw new AppError(400, "Task ID and Image ID are required");
    }

    await deleteTaskImageService(taskId, imageId, user.id);
    sendResponse(res, 200, "Image deleted successfully!", null);
  },
);

// Exporting controllers for use in routes
export {
  addTaskImagesController,
  approveTaskCompletionController,
  createTaskController,
  deleteTaskController,
  deleteTaskImageController,
  getAllMyTasksController,
  getTaskByIdController,
  getTasksController,
  markTaskAsInProgressController,
  markTaskCompletedController,
  requestTaskRevisionController,
  updateTaskController,
  updateTaskImagesController
};

