import { Gender } from "../../generated/prisma/enums";
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
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { message: "Name must not be empty" })
        .max(100, { message: "Name must be less than 100 characters" })
        .optional(),
      dateOfBirth: z.coerce.date().optional(),
      gender: z.enum(Gender).optional(),
      address: z
        .string()
        .trim()
        .min(1, { message: "Address must not be empty" })
        .max(255, { message: "Address must be less than 255 characters" })
        .optional(),
      phone: z
        .string()
        .regex(/^01\d{9}$/, {
          message:
            "Phone must be 11 digits, start with 01 and contain only numbers",
        })
        .optional(),
      bio: z
        .string()
        .trim()
        .max(500, { message: "Bio must be less than 500 characters" })
        .optional(),
    })
    .strict(),
});

export const completeUserProfileSchema = z.object({
  body: z
    .object({
      dateOfBirth: z.coerce.date(),
      gender: z.enum(Gender, {
        message: "Gender must be a MALE, FEMALE, or OTHER",
      }),
      address: z
        .string()
        .trim()
        .min(1, { message: "Address is required" })
        .max(255, { message: "Address must be less than 255 characters" }),
      phone: z.string().regex(/^01\d{9}$/, {
        message:
          "Phone must be 11 digits, start with 01 and contain only numbers",
      }),
      bio: z
        .string()
        .trim()
        .max(500, { message: "Bio must be less than 500 characters" })
        .optional(),
    })
    .strict(),
});

export const updateAvatarSchema = z.object({
  body: z
    .object({
      image: z
        .url({ message: "Image must be a valid URL" })
        .max(255, { message: "Image URL must be less than 255 characters" }),
    })
    .strict(),
});

export const getPublicProfileSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type CompleteUserProfileInput = z.infer<
  typeof completeUserProfileSchema
>["body"];
