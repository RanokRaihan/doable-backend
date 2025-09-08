import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { CreateUserInput } from "./user.validator";

export const createUserService = async (payload: CreateUserInput) => {
  // Logic to create a user
  const { password, email } = payload;
  try {
    if (!password) {
      throw new AppError(
        400,
        "Password is required!",
        "VALIDATION_ERROR",
        "password"
      );
    }
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(
        400,
        "User with this email already exists!",
        "VALIDATION_ERROR",
        "email"
      );
    }
    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      ...payload,
      password: hashedPassword,
    };
    //create user with prisma
    const newUser = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return newUser;
  } catch (error) {
    throw error;
  }
};

export const getAllUsersService = async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  } catch (error) {
    throw error;
  }
};

export const getUserByEmailService = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

export const getUserByIdService = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }

    return user;
  } catch (error) {
    throw error;
  }
};
