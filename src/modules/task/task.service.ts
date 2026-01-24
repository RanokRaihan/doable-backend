import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import {
  taskFilterableFields,
  TaskSearchFields,
  taskSensitiveFieldsOwner,
  taskSensitiveFieldsPublic,
  taskSortableFields,
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

const getTasksService = async (parsedQuery: ParsedQuery) => {
  try {
    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      searchFields: TaskSearchFields,
      filterFields: taskFilterableFields,
      sortFields: taskSortableFields,
    });
    const mergedWhere = {
      ...where,
      isDeleted: false,
    };
    const queryOptions: any = {
      where: mergedWhere,
      skip,
      take,
      include: { images: true },
      omit: { ...taskSensitiveFieldsPublic },
    };

    if (orderBy) {
      queryOptions.orderBy = orderBy;
    }
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany(queryOptions),
      prisma.task.count({ where: mergedWhere }),
    ]);
    const meta = buildMeta(totalCount, parsedQuery.pagination);
    return { data: tasks, meta };
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
  taskData: UpdateTaskPayload,
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
      Object.entries(taskData).filter(([_, value]) => value !== undefined),
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

// mark task as in progress
const markTaskAsInProgressService = async (taskId: string, userId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { approvedApplication: true },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    if (
      !task.approvedApplication ||
      task.approvedApplication.applicantId !== userId
    ) {
      throw new AppError(403, "Unauthorized to mark this task as in progress");
    }
    if (task.status === "IN_PROGRESS") {
      throw new AppError(400, "Task is already in progress!");
    }
    if (task.status !== "ASSIGNED") {
      throw new AppError(400, "Task is not assigned yet!");
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });
  } catch (error) {
    console.error("Error marking task as in progress:", error);
    throw error;
  }
};

// task completion services
const markTaskAsCompletedService = async (taskId: string, userId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { approvedApplication: true },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    if (task.status === "PENDING_REVIEW") {
      throw new AppError(400, "Task is already marked as completed!");
    }
    if (task.status !== "IN_PROGRESS") {
      throw new AppError(
        400,
        "Task is not in progress state!make it in progress first",
      );
    }
    if (
      !task.approvedApplication ||
      task.approvedApplication.applicantId !== userId
    ) {
      throw new AppError(403, "Unauthorized to mark this task as completed");
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "PENDING_REVIEW" },
    });
  } catch (error) {
    console.error("Error marking task as completed:", error);
    throw error;
  }
};

const approveTaskCompletionService = async (taskId: string, userId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { approvedApplication: true },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    if (task.status === "PAYMENT_PROCESSING") {
      throw new AppError(
        400,
        "Task is already approved for payment processing!",
      );
    }
    if (task.postedById !== userId) {
      throw new AppError(403, "Unauthorized to approve this task completion");
    }
    if (task.status !== "PENDING_REVIEW") {
      throw new AppError(
        400,
        "Task is not pending review!cannot approve completion",
      );
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "PAYMENT_PROCESSING" },
    });
  } catch (error) {
    console.error("Error approving task completion:", error);
    throw error;
  }
};

const requestTaskRevisionService = async (taskId: string, userId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { approvedApplication: true },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    if (task.postedById !== userId) {
      throw new AppError(
        403,
        "Unauthorized to request revision for this task completion",
      );
    }
    if (task.status !== "PENDING_REVIEW") {
      throw new AppError(
        400,
        "Revision can only be requested for tasks pending review!",
      );
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });
  } catch (error) {
    console.error("Error approving task completion:", error);
    throw error;
  }
};

// Exporting the service functions for use in other parts of the application
export {
  approveTaskCompletionService,
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  getTasksService,
  insertImageUrls,
  markTaskAsCompletedService,
  markTaskAsInProgressService,
  requestTaskRevisionService,
  updateTaskService,
};
