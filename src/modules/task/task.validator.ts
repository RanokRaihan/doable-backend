import { TaskCategory, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { taskSortableFields } from "./task.constant";

const createTaskSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .min(1, "Title is required")
        .max(200, "Title must be 200 characters or less"),
      description: z.string().min(1, "Description is required"),
      category: z.enum(TaskCategory),
      priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM),
      location: z
        .string()
        .min(1, "Location is required")
        .max(255, "Location must be 255 characters or less"),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      baseCompensation: z
        .number()
        .positive("Base compensation must be positive"),
      scheduledAt: z.iso.datetime("Invalid date format"),
      estimatedDuration: z
        .number()
        .int()
        .positive("Estimated duration is required"),
      expiresAt: z.iso.datetime().optional(),
    })
    .strict(),
});
const updateTaskSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .min(1, "Title is required")
        .max(200, "Title must be 200 characters or less")
        .optional(),
      description: z.string().min(1, "Description is required").optional(),
      category: z.enum(TaskCategory).optional(),
      priority: z.enum(TaskPriority).optional(),
      location: z
        .string()
        .min(1, "Location is required")
        .max(255, "Location must be 255 characters or less")
        .optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      baseCompensation: z
        .number()
        .positive("Base compensation must be positive")
        .optional(),
      scheduledAt: z.iso.datetime("Invalid date format").optional(),
      estimatedDuration: z
        .number()
        .int()
        .positive("Estimated duration is required")
        .optional(),
      expiresAt: z.iso.datetime().optional(),
    })
    .strict(),
});
//get all tasks query validation
const getAllTasksSchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .optional()
        .refine((val) => !val || /^\d+$/.test(val), {
          message: "Page must be a positive integer",
        }),
      limit: z
        .string()
        .optional()
        .refine((val) => !val || /^\d+$/.test(val), {
          message: "Limit must be a positive integer",
        }),
      sortBy: z
        .enum(taskSortableFields, {
          error: `Invalid sortBy field! Allowed fields are: ${taskSortableFields.join(", ")}`,
        })
        .optional(),
      sortOrder: z
        .enum(["asc", "desc"], {
          error: "sortOrder must be either 'asc' or 'desc'",
        })
        .optional(),
      searchTerm: z.string().optional(),
      status: z
        .enum(TaskStatus, {
          error: `Invalid status! Allowed statuses are: ${Object.values(TaskStatus).join(", ")}`,
        })
        .optional(),
      category: z
        .enum(TaskCategory, {
          error: `Invalid category! Allowed categories are: ${Object.values(
            TaskCategory,
          ).join(", ")}`,
        })
        .optional(),
      priority: z
        .enum(TaskPriority, {
          error: `Invalid priority! Allowed priorities are: ${Object.values(TaskPriority).join(", ")}`,
        })
        .optional(),
    })
    .strict(),
});
// exports

export { createTaskSchema, getAllTasksSchema, updateTaskSchema };
