import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import {
  taskSensitiveFieldsOwner,
  taskSensitiveFieldsPublic,
} from "./task.constant";
import { CreateTaskPayload, UpdateTaskPayload } from "./task.interface";

// Contains business logic for task operations
const createTaskService = async (taskData: CreateTaskPayload) => {
  try {
    const newTask = await prisma.task.create({
      data: {
        ...taskData,
        latitude: taskData.latitude ?? null,
        longitude: taskData.longitude ?? null,
        expiresAt: taskData.expiresAt ?? null,
      },
      omit: {
        ...taskSensitiveFieldsOwner,
      },
    });

    return newTask;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};
//TODO:update get all task according to usecase

const getTasksService = async () => {
  try {
    const tasks = await prisma.task.findMany({
      where: { isDeleted: false },
      include: {
        images: true,
      },
      omit: {
        ...taskSensitiveFieldsPublic,
      },
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
};

//get task by id
const getTaskByIdService = async (taskId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: {
        images: true,
        approvedApplication: true,
      },
      omit: {
        ...taskSensitiveFieldsPublic,
      },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    return task;
  } catch (error) {
    console.error("Error fetching task by ID:", error);
    throw error;
  }
};

// update task service
const updateTaskService = async (
  taskId: string,
  userId: string,
  taskData: UpdateTaskPayload
) => {
  try {
    console.log(userId);
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, postedById: userId, isDeleted: false },
    });
    if (!existingTask) {
      throw new AppError(404, "Task not found or unauthorized");
    }

    const filteredTaskData = Object.fromEntries(
      Object.entries(taskData).filter(([_, value]) => value !== undefined)
    );
    console.log({ taskData, filteredTaskData });

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: filteredTaskData,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
      },
    });
    return updatedTask;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// soft delete task service
const deleteTaskService = async (taskId: string, userId: string) => {
  try {
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, postedById: userId, isDeleted: false },
    });
    if (!existingTask) {
      throw new AppError(404, "Task not found!");
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { isDeleted: true },
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};

// insert image urls
const insertImageUrls = async (taskId: string, imageUrls: string[]) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }

    const imageRecords = imageUrls.map((url, index) => ({
      taskId,
      url,
      altText: `Image ${index + 1} for task: ${task.title}`,
    }));
    await prisma.image.createMany({ data: imageRecords });
  } catch (error) {
    console.error("Error inserting image URLs:", error);
    throw error;
  }
};

export {
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  getTasksService,
  insertImageUrls,
  updateTaskService,
};
