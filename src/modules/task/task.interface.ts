import z from "zod";
import {
  addTaskImagesSchema,
  createTaskSchema,
  updateTaskSchema,
} from "./task.validator";

export type CreateTaskRequest = z.infer<typeof createTaskSchema>["body"];
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>["body"];
export type AddTaskImagesRequest = z.infer<typeof addTaskImagesSchema>["body"];

export interface CreateTaskPayload extends CreateTaskRequest {
  postedById: string;
}
