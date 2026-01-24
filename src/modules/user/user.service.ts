import { UserProfileStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import { updateableUserFields } from "./user.constant";
import {
  CompleteUserProfileInput,
  CreateUserInput,
  UpdateUserInput,
} from "./user.validator";

const createUserService = async (payload: CreateUserInput) => {
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
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
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

      await tx.wallet.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    const newUser = result;
    return newUser;
  } catch (error) {
    throw error;
  }
};

const getAllUsersService = async () => {
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

const getUserByEmailService = async (email: string) => {
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

const getUserByIdService = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        image: true,
        name: true,
        bio: true,
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

const completeUserProfileService = async (
  userId: string,
  profileData: CompleteUserProfileInput
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }
    if (user.profileStatus === UserProfileStatus.COMPLETE) {
      throw new AppError(
        400,
        "User profile is already complete",
        "BAD_REQUEST",
        "user"
      );
    }
    // second layer of validation to prevent overwriting unintended fields
    const payload = {
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      address: profileData.address,
      phone: profileData.phone,
      bio: profileData.bio || null,
      profileStatus: UserProfileStatus.COMPLETE,
    };
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: payload,
      select: {
        id: true,
        email: true,
        name: true,
        dateOfBirth: true,
        address: true,
        phone: true,
        gender: true,
        bio: true,
        profileStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

const updateUserService = async (userId: string, payload: UpdateUserInput) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }
    if (user.profileStatus === UserProfileStatus.INCOMPLETE) {
      throw new AppError(
        400,
        "Complete your profile before updating",
        "BAD_REQUEST",
        "user"
      );
    }
    const updateData = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );
    updateableUserFields.forEach((field) => {
      if (!(field in updateData)) {
        delete updateData[field as keyof typeof updateData];
      }
    });
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        dateOfBirth: true,
        address: true,
        phone: true,
        gender: true,
        bio: true,
        profileStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

const updateUserAvatarService = async (userId: string, image: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }
    if (user.profileStatus === UserProfileStatus.INCOMPLETE) {
      throw new AppError(
        400,
        "Complete your profile before updating avatar",
        "BAD_REQUEST",
        "user"
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

const deleteAccountService = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return;
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw error;
  }
};

export {
  completeUserProfileService,
  createUserService,
  deleteAccountService,
  getAllUsersService,
  getUserByEmailService,
  getUserByIdService,
  updateUserAvatarService,
  updateUserService,
};
