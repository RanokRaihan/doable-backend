import { z } from "zod";

export const loginValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format"),
      password: z.string().min(1, "Password is required"),
    })
    .strict(),
});

export const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string().min(1, "Old password is required"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long"),
    })
    .strict(),
});
