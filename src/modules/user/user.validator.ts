import { Gender, Provider, UserProfileStatus, UserRole } from "@prisma/client";
import { z } from "zod";

// Validation logic for user input
export const createUserSchema = z.object({
  body: z
    .object({
      email: z.email().max(255),
      name: z.string().min(1).max(100),
      password: z.string().min(8).max(255).optional(),
      role: z.enum(UserRole).default(UserRole.USER),
      provider: z.enum(Provider).default(Provider.CREDENTIALS),
      image: z.url().max(500).optional(),
      dateOfBirth: z.date().optional(),
      gender: z.enum(Gender).optional(),
      address: z.string().optional(),
      phone: z.string().max(20).optional(),
      bio: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.provider === Provider.CREDENTIALS) {
          return data.password !== undefined && data.password.length >= 8;
        }
        return true;
      },
      {
        message: "Password is required ",
        path: ["password"],
      }
    ),
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

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileStatusInput = z.infer<
  typeof updateProfileStatusSchema
>;
