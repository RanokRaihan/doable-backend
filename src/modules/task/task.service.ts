import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { buildMeta, buildPrismaQuery, ParsedQuery } from "../../utils/query";
import { paymentSelectFieldsOwner } from "../payment/payment.constant";
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

const getTasksService = async (
  parsedQuery: ParsedQuery,
  userId: string | undefined,
) => {
  try {
    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      searchFields: TaskSearchFields,
      filterFields: taskFilterableFields,
      sortFields: taskSortableFields,
    });
    const mergedWhere = {
      ...where,
      isDeleted: false,
      status: "OPEN",
      ...(userId ? { NOT: { postedById: userId } } : {}),
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

// Get all tasks posted by the current user
const getAllMyTasksService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
  try {
    const { where, skip, take, orderBy } = buildPrismaQuery(parsedQuery, {
      searchFields: TaskSearchFields,
      filterFields: taskFilterableFields,
      sortFields: taskSortableFields,
    });

    const mergedWhere = {
      ...where,
      postedById: userId,
      isDeleted: false,
    };

    const queryOptions: any = {
      where: mergedWhere,
      skip,
      take,
      include: { images: true },
      omit: { ...taskSensitiveFieldsOwner },
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
    console.error("Error fetching user's tasks:", error);
    throw error;
  }
};

// Get specific task posted by the current user
const getMyPostedTaskService = async (userId: string, taskId: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        postedById: userId,
        isDeleted: false,
      },
      include: {
        images: true,
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        },
        payments: {
          select: {
            ...paymentSelectFieldsOwner,
          },
        },
      },
      omit: {
        ...taskSensitiveFieldsOwner,
      },
    });

    if (!task) {
      throw new AppError(
        404,
        "Task not found or you don't have permission to view it",
      );
    }

    return task;
  } catch (error) {
    console.error("Error fetching user's task:", error);
    throw error;
  }
};

//get task by id
const getTaskByIdService = async (taskId: string, userId?: string) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: {
        images: true,
        postedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      omit: {
        ...taskSensitiveFieldsPublic,
      },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }
    let hasApplied = false;
    if (task.postedById !== userId && userId) {
      const application = await prisma.application.findFirst({
        where: {
          taskId,
          applicantId: userId,
        },
      });
      hasApplied = !!application;
    }
    return { ...task, hasApplied };
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

// add task images service
const addTaskImagesService = async (
  taskId: string,
  userId: string,
  images: { url: string; altText?: string | undefined }[],
) => {
  try {
    // Fetch task and verify it exists and is not deleted
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }

    // Verify user is the task owner
    if (task.postedById !== userId) {
      throw new AppError(
        403,
        "Unauthorized: You can only add images to your own tasks",
      );
    }

    // Check if task already has images
    const existingImagesCount = await prisma.image.count({
      where: { taskId },
    });
    if (existingImagesCount > 0) {
      throw new AppError(
        400,
        "This task already has images. Remove existing images before adding new ones.",
      );
    }

    // Prepare image records
    const imageRecords = images.map((img) => ({
      taskId,
      url: img.url,
      altText: img.altText || null,
    }));

    // Create images
    await prisma.image.createMany({ data: imageRecords });

    // Fetch and return created images
    const createdImages = await prisma.image.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return createdImages;
  } catch (error) {
    console.error("Error adding task images:", error);
    throw error;
  }
};

// update task images service
const updateTaskImagesService = async (
  taskId: string,
  userId: string,
  keepImageIds: string[],
  newImages: { url: string; altText?: string | undefined }[],
) => {
  try {
    // Fetch task + existing images in a single query
    const task = await prisma.task.findFirst({
      where: { id: taskId, isDeleted: false },
      include: { images: { select: { id: true } } },
    });
    if (!task) {
      throw new AppError(404, "Task not found");
    }

    // Verify user is the task owner
    if (task.postedById !== userId) {
      throw new AppError(
        403,
        "Unauthorized: You can only update images of your own tasks",
      );
    }

    // Validate that all keepImageIds actually belong to this task
    const existingImageIds = new Set(task.images.map((img) => img.id));
    const invalidIds = keepImageIds.filter((id) => !existingImageIds.has(id));
    if (invalidIds.length > 0) {
      throw new AppError(
        400,
        `The following image IDs do not belong to this task: ${invalidIds.join(", ")}`,
      );
    }

    // Guard against total exceeding 5 (also validated by Zod)
    if (keepImageIds.length + newImages.length > 5) {
      throw new AppError(400, "Total number of images cannot exceed 5");
    }

    // Determine which existing images to delete
    const keepSet = new Set(keepImageIds);
    const idsToDelete = task.images
      .map((img) => img.id)
      .filter((id) => !keepSet.has(id));

    // Delete removed images and create new ones atomically
    await prisma.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.image.deleteMany({
          where: { id: { in: idsToDelete }, taskId },
        });
      }
      if (newImages.length > 0) {
        await tx.image.createMany({
          data: newImages.map((img) => ({
            taskId,
            url: img.url,
            altText: img.altText || null,
          })),
        });
      }
    });

    // Return the final set of images for this task
    const updatedImages = await prisma.image.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    return updatedImages;
  } catch (error) {
    console.error("Error updating task images:", error);
    throw error;
  }
};

// delete a single task image
const deleteTaskImageService = async (
  taskId: string,
  imageId: string,
  userId: string,
) => {
  try {
    // Fetch task and the specific image in one query
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        task: { select: { postedById: true, isDeleted: true } },
      },
    });

    if (!image || image.taskId !== taskId) {
      throw new AppError(404, "Image not found");
    }

    if (image.task.isDeleted) {
      throw new AppError(404, "Task not found");
    }

    if (image.task.postedById !== userId) {
      throw new AppError(
        403,
        "Unauthorized: You can only delete images from your own tasks",
      );
    }

    await prisma.image.delete({ where: { id: imageId } });
  } catch (error) {
    console.error("Error deleting task image:", error);
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
    if (
      task.status === "PAYMENT_PENDING" ||
      task.status === "PAYMENT_INITIATED"
    ) {
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
      data: { status: "PAYMENT_PENDING" },
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

// Get related tasks by category (up to 4, excluding the source task)
const getRelatedTasksService = async (taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    select: { id: true, category: true },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const relatedTasks = await prisma.task.findMany({
    where: {
      isDeleted: false,
      status: "OPEN",
      category: task.category,
      NOT: { id: taskId },
    },
    include: { images: true },
    omit: { ...taskSensitiveFieldsPublic },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return relatedTasks;
};

// Get recently posted tasks (latest 3, exclude current user's tasks)
const getRecentlyPostedTasksService = async (userId: string | undefined) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        status: "OPEN",
        ...(userId ? { NOT: { postedById: userId } } : {}),
      },
      include: { images: true },
      omit: { ...taskSensitiveFieldsPublic },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return tasks;
  } catch (error) {
    console.error("Error fetching recently posted tasks:", error);
    throw error;
  }
};

// Exporting the service functions for use in other parts of the application
export {
  addTaskImagesService,
  approveTaskCompletionService,
  createTaskService,
  deleteTaskImageService,
  deleteTaskService,
  getAllMyTasksService,
  getMyPostedTaskService,
  getRecentlyPostedTasksService,
  getRelatedTasksService,
  getTaskByIdService,
  getTasksService,
  markTaskAsCompletedService,
  markTaskAsInProgressService,
  requestTaskRevisionService,
  updateTaskImagesService,
  updateTaskService,
};
