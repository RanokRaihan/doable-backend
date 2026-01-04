import z from "zod";
import { createApplicationSchema } from "./application.validation";

export type CreateApplicationRequest = z.infer<
  typeof createApplicationSchema
>["body"];

export interface CreateApplicationPayload extends CreateApplicationRequest {
  applicantId: string;
  taskId: string;
}
