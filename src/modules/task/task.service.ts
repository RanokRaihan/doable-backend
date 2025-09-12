import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { CreateTaskPayload } from "./task.interface";

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
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        location: true,
        latitude: true,
        longitude: true,
        baseCompensation: true,
        scheduledAt: true,
        estimatedDuration: true,
        expiresAt: true,
        postedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newTask;
  } catch (error) {
    console.error("Error creating task:", error);
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

export { createTaskService, insertImageUrls };
