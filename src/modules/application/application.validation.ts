import { z } from "zod";

export const createApplicationSchema = z.object({
  body: z
    .object({
      message: z
        .string()
        .min(10, "Message must be at least 10 characters long")
        .max(5000, "Message cannot exceed 5000 characters"),
      proposedCompensation: z
        .number()
        .positive("Proposed compensation must be a positive number"),
    })
    .strict(),
});

export const withdrawApplicationSchema = z.object({
  body: z.object({
    withdrawalReason: z
      .string()
      .min(10, "Withdrawal reason must be at least 10 characters long")
      .max(500, "Withdrawal reason cannot exceed 500 characters"),
  }),
});

export const rejectApplicationSchema = z.object({
  body: z.object({
    rejectionReason: z
      .string()
      .min(10, "Rejection reason must be at least 10 characters long")
      .max(500, "Rejection reason cannot exceed 500 characters"),
  }),
});
