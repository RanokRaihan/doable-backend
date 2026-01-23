import { z } from "zod";

const loginValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format"),
      password: z.string().min(1, "Password is required"),
    })
    .strict(),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string().min(1, "Old password is required"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long"),
    })
    .strict(),
});

const forgotPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format"),
    })
    .strict(),
});

const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long"),
      resetToken: z.string().min(1, "Reset token is required"),
    })
    .strict(),
});
const sendVerificationEmailSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format"),
    })
    .strict(),
});
const verifyEmailValidationSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, "Token is required"),
    })
    .strict(),
});

export {
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  loginValidationSchema,
  resetPasswordValidationSchema,
  sendVerificationEmailSchema,
  verifyEmailValidationSchema,
};
