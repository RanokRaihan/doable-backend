import z from "zod";
import { createTaskSchema } from "./task.validator";

export type CreateTaskRequest = z.infer<typeof createTaskSchema>["body"];

export interface CreateTaskPayload extends CreateTaskRequest {
  postedById: string;
}
