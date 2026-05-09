import { z } from "zod";

const withdrawalMethodBody = z
  .object({
    methodType: z.enum(["BANK", "MOBILE_BANKING"]),
    accountNumber: z.string().min(1).max(50),
    accountName: z.string().min(1).max(100),
    bankName: z.string().max(100).optional(),
    branchName: z.string().max(100).optional(),
    routingNumber: z.string().max(50).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.methodType === "BANK" && !data.bankName) {
      ctx.addIssue({
        code: "custom",
        message: "bankName is required for BANK method type",
        path: ["bankName"],
      });
    }
  });

const createWithdrawalMethodSchema = z.object({
  body: withdrawalMethodBody,
});

const updateWithdrawalMethodSchema = z.object({
  body: z
    .object({
      methodType: z.enum(["BANK", "MOBILE_BANKING"]).optional(),
      accountNumber: z.string().min(1).max(50).optional(),
      accountName: z.string().min(1).max(100).optional(),
      bankName: z.string().max(100).optional(),
      branchName: z.string().max(100).optional(),
      routingNumber: z.string().max(50).optional(),
      isDefault: z.boolean().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      const provided = Object.values(data).filter((v) => v !== undefined);
      if (provided.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one field must be provided to update",
        });
      }
    }),
  params: z.object({ id: z.string().min(1) }),
});

const setDefaultWithdrawalMethodSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

const deleteWithdrawalMethodSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

const getWithdrawalMethodByIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

const createWithdrawalRequestSchema = z.object({
  body: z
    .object({
      withdrawalMethodId: z.string().min(1),
      amount: z.number().positive().min(10),
      note: z.string().max(500).optional(),
    })
    .strict(),
});

const editWithdrawalRequestSchema = z.object({
  body: z
    .object({
      amount: z.number().positive().min(10).optional(),
      note: z.string().max(500).optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.amount === undefined && data.note === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "At least one field (amount or note) must be provided",
        });
      }
    }),
  params: z.object({ id: z.string().min(1) }),
});

const cancelWithdrawalRequestSchema = z.object({
  body: z
    .object({
      cancellationReason: z.string().max(500).optional(),
    })
    .strict(),
  params: z.object({ id: z.string().min(1) }),
});

const getWithdrawalRequestByIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export {
  cancelWithdrawalRequestSchema,
  createWithdrawalMethodSchema,
  createWithdrawalRequestSchema,
  deleteWithdrawalMethodSchema,
  editWithdrawalRequestSchema,
  getWithdrawalMethodByIdSchema,
  getWithdrawalRequestByIdSchema,
  setDefaultWithdrawalMethodSchema,
  updateWithdrawalMethodSchema,
};
