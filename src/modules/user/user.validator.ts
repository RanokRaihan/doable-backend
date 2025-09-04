import { Gender, UserProfileStatus } from "@prisma/client";
import { z } from "zod";

// Validation logic for user input
export const createUserSchema = z.object({
  body: z
    .object({
      email: z
        .email({ message: "Invalid email format" })
        .max(255, { message: "Email must be less than 255 characters" }),
      name: z
        .string()
        .min(1, { message: "Name is required" })
        .max(100, { message: "Name must be less than 100 characters" }),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(255, { message: "Password must be less than 255 characters" }),
    })
    .strict(),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    image: z.url().max(500).optional(),
    dateOfBirth: z.date().optional(),
    gender: z.enum(Gender).optional(),
    address: z.string().optional(),
    phone: z.string().max(20).optional(),
    bio: z.string().optional(),
  }),
});

export const userLoginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(1, { message: "Password is required" }),
  }),
});

export const passwordResetSchema = z.object({
  body: z.object({
    email: z.email(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, { message: "New password must be at least 8 characters long" })
      .max(255),
  }),
});

export const updateProfileStatusSchema = z.object({
  body: z.object({
    profileStatus: z.enum(UserProfileStatus),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type UserLoginInput = z.infer<typeof userLoginSchema>["body"];
export type PasswordResetInput = z.infer<typeof passwordResetSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
export type UpdateProfileStatusInput = z.infer<
  typeof updateProfileStatusSchema
>["body"];
