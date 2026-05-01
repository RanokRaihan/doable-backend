import { UserProfileStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";
import {
  PUBLIC_PROFILE_REVIEWS_LIMIT,
  PUBLIC_PROFILE_TASKS_LIMIT,
  PUBLIC_PROFILE_VISIBLE_TASK_STATUSES,
  updateableUserFields,
} from "./user.constant";
import type { PublicUserProfile } from "./user.interface";
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
        "password",
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
        "email",
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
  profileData: CompleteUserProfileInput,
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
        "user",
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
        emailVerified: true,
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
        "user",
      );
    }
    const updateData = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
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
        "user",
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

const getPublicProfileService = async (
  userId: string,
): Promise<PublicUserProfile> => {
  const [
    user,
    tasksPostedCount,
    postedTasks,
    posterReviewAgg,
    doerReviewAgg,
    totalApprovedApps,
    completedAsDoer,
    publicReviews,
  ] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        gender: true,
        createdAt: true,
      },
    }),
    prisma.task.count({
      where: {
        postedById: userId,
        isDeleted: false,
        status: { not: "DRAFT" },
      },
    }),
    prisma.task.findMany({
      where: {
        postedById: userId,
        isDeleted: false,
        status: { in: [...PUBLIC_PROFILE_VISIBLE_TASK_STATUSES] },
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        baseCompensation: true,
        location: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PUBLIC_PROFILE_TASKS_LIMIT,
    }),
    prisma.review.aggregate({
      where: {
        recipientId: userId,
        isPublic: true,
        task: { postedById: userId },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.aggregate({
      where: {
        recipientId: userId,
        isPublic: true,
        task: { postedById: { not: userId } },
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.application.count({
      where: { applicantId: userId, status: "APPROVED" },
    }),
    prisma.application.count({
      where: {
        applicantId: userId,
        status: "APPROVED",
        task: { status: "COMPLETED" },
      },
    }),
    prisma.review.findMany({
      where: { recipientId: userId, isPublic: true },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PUBLIC_PROFILE_REVIEWS_LIMIT,
    }),
  ]);

  if (!user) {
    throw new AppError(404, "User not found", "NOT_FOUND", "user");
  }

  const posterAvgRating = posterReviewAgg._avg.rating;
  const doerAvgRating = doerReviewAgg._avg.rating;

  const completionRate =
    totalApprovedApps === 0
      ? null
      : Math.round((completedAsDoer / totalApprovedApps) * 100) / 100;

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    bio: user.bio,
    gender: user.gender,
    memberSince: user.createdAt,
    stats: {
      asPoster: {
        tasksPosted: tasksPostedCount,
        averageRating:
          posterAvgRating !== null
            ? Math.round(posterAvgRating * 100) / 100
            : null,
        reviewCount: posterReviewAgg._count._all,
      },
      asDoer: {
        tasksCompleted: completedAsDoer,
        completionRate,
        averageRating:
          doerAvgRating !== null
            ? Math.round(doerAvgRating * 100) / 100
            : null,
        reviewCount: doerReviewAgg._count._all,
      },
    },
    reviews: publicReviews,
    postedTasks,
  };
};

export {
  completeUserProfileService,
  createUserService,
  deleteAccountService,
  getAllUsersService,
  getPublicProfileService,
  getUserByEmailService,
  getUserByIdService,
  updateUserAvatarService,
  updateUserService,
};
