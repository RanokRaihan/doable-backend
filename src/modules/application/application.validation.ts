import { z } from "zod";
import { ApplicationStatus } from "../../generated/prisma/enums";
import { applicationSortableFields } from "./application.constant";

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

// Get all my applications query validation
export const getAllMyApplicationsSchema = z.object({
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
        .enum(applicationSortableFields, {
          error: `Invalid sortBy field! Allowed fields are: ${applicationSortableFields.join(", ")}`,
        })
        .optional(),
      sortOrder: z
        .enum(["asc", "desc"], {
          error: "sortOrder must be either 'asc' or 'desc'",
        })
        .optional(),
      searchTerm: z.string().optional(),
      status: z
        .union([
          z.enum(ApplicationStatus),
          z.string().refine(
            (val) => {
              const statuses = val.split(",").map((status) => status.trim());
              return statuses.every((status) =>
                Object.values(ApplicationStatus).includes(
                  status as ApplicationStatus,
                ),
              );
            },
            {
              message: `Invalid status! Allowed statuses are: ${Object.values(ApplicationStatus).join(", ")}`,
            },
          ),
        ])
        .optional(),
    })
    .strict(),
});

// Get all applications for a task query validation
export const getAllApplicationsForTaskSchema = z.object({
  params: z.object({
    taskId: z.string().min(1, "Task ID is required"),
  }),
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
        .enum(applicationSortableFields, {
          error: `Invalid sortBy field! Allowed fields are: ${applicationSortableFields.join(", ")}`,
        })
        .optional(),
      sortOrder: z
        .enum(["asc", "desc"], {
          error: "sortOrder must be either 'asc' or 'desc'",
        })
        .optional(),
      searchTerm: z.string().optional(),
      status: z
        .union([
          z.enum(ApplicationStatus),
          z.string().refine(
            (val) => {
              const statuses = val.split(",").map((status) => status.trim());
              return statuses.every((status) =>
                Object.values(ApplicationStatus).includes(
                  status as ApplicationStatus,
                ),
              );
            },
            {
              message: `Invalid status! Allowed statuses are: ${Object.values(ApplicationStatus).join(", ")}`,
            },
          ),
        ])
        .optional(),
    })
    .strict(),
});
