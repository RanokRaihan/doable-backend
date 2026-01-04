import z from "zod";
import { createTaskSchema, updateTaskSchema } from "./task.validator";

export type CreateTaskRequest = z.infer<typeof createTaskSchema>["body"];
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>["body"];

export interface CreateTaskPayload extends CreateTaskRequest {
  postedById: string;
}
