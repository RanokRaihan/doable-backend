import { z } from "zod";

const loginValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format").transform((v) => v.toLowerCase().trim()),
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
        .min(8, "New password must be at least 8 characters long")
        .regex(/[a-zA-Z]/, "Password must contain at least one letter"),
    })
    .strict(),
});

const forgotPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format").transform((v) => v.toLowerCase().trim()),
    })
    .strict(),
});

const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format").transform((v) => v.toLowerCase().trim()),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long")
        .regex(/[a-zA-Z]/, "Password must contain at least one letter"),
      resetToken: z.string().min(1, "Reset token is required"),
    })
    .strict(),
});

const sendVerificationEmailSchema = z.object({
  body: z
    .object({
      email: z.email("Invalid email format").transform((v) => v.toLowerCase().trim()),
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

const refreshTokenValidationSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .strict(),
});

export {
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  resetPasswordValidationSchema,
  sendVerificationEmailSchema,
  verifyEmailValidationSchema,
};
