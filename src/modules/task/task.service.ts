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

const createTaskService = async (taskData: CreateTaskPayload) => {
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
};

const getTasksService = async (
  parsedQuery: ParsedQuery,
  userId: string | undefined,
) => {
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
};

const getAllMyTasksService = async (
  userId: string,
  parsedQuery: ParsedQuery,
) => {
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
};

const getMyPostedTaskService = async (userId: string, taskId: string) => {
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
};

const getTaskByIdService = async (taskId: string, userId?: string) => {
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
};

// ISSUE-007: removed console.log(userId) and console.log({ taskData, filteredTaskData })
const updateTaskService = async (
  taskId: string,
  userId: string,
  taskData: UpdateTaskPayload,
) => {
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, postedById: userId, isDeleted: false },
  });
  if (!existingTask) {
    throw new AppError(404, "Task not found or unauthorized");
  }

  const filteredTaskData = Object.fromEntries(
    Object.entries(taskData).filter(([_, value]) => value !== undefined),
  );

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
};

const deleteTaskService = async (taskId: string, userId: string) => {
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
};

const addTaskImagesService = async (
  taskId: string,
  userId: string,
  images: { url: string; altText?: string | undefined }[],
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
  });
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  if (task.postedById !== userId) {
    throw new AppError(
      403,
      "Unauthorized: You can only add images to your own tasks",
    );
  }

  const existingImagesCount = await prisma.image.count({
    where: { taskId },
  });
  if (existingImagesCount > 0) {
    throw new AppError(
      400,
      "This task already has images. Remove existing images before adding new ones.",
    );
  }

  const imageRecords = images.map((img) => ({
    taskId,
    url: img.url,
    altText: img.altText || null,
  }));

  await prisma.image.createMany({ data: imageRecords });

  const createdImages = await prisma.image.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });

  return createdImages;
};

const updateTaskImagesService = async (
  taskId: string,
  userId: string,
  keepImageIds: string[],
  newImages: { url: string; altText?: string | undefined }[],
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, isDeleted: false },
    include: { images: { select: { id: true } } },
  });
  if (!task) {
    throw new AppError(404, "Task not found");
  }

  if (task.postedById !== userId) {
    throw new AppError(
      403,
      "Unauthorized: You can only update images of your own tasks",
    );
  }

  const existingImageIds = new Set(task.images.map((img) => img.id));
  const invalidIds = keepImageIds.filter((id) => !existingImageIds.has(id));
  if (invalidIds.length > 0) {
    throw new AppError(
      400,
      `The following image IDs do not belong to this task: ${invalidIds.join(", ")}`,
    );
  }

  if (keepImageIds.length + newImages.length > 5) {
    throw new AppError(400, "Total number of images cannot exceed 5");
  }

  const keepSet = new Set(keepImageIds);
  const idsToDelete = task.images
    .map((img) => img.id)
    .filter((id) => !keepSet.has(id));

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

  const updatedImages = await prisma.image.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });

  return updatedImages;
};

const deleteTaskImageService = async (
  taskId: string,
  imageId: string,
  userId: string,
) => {
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
};

const markTaskAsInProgressService = async (taskId: string, userId: string) => {
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
};

const markTaskAsCompletedService = async (taskId: string, userId: string) => {
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
};

const approveTaskCompletionService = async (taskId: string, userId: string) => {
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
};

const requestTaskRevisionService = async (taskId: string, userId: string) => {
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
};

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

const getRecentlyPostedTasksService = async (userId: string | undefined) => {
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
};

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
