import { RequestHandler } from "express";
import { SignOptions } from "jsonwebtoken";
import config from "../../config";
import { AppError, ResponseHandler, asyncHandler, sendResponse } from "../../utils";
import { createToken } from "../../utils/createToken";
import { IJwtPayload } from "../auth/auth.interface";
import { getCurrentUserService } from "../auth/auth.service";
import {
  completeUserProfileService,
  createUserService,
  deleteAccountService,
  getAllUsersService,
  getPublicProfileService,
  getUserByEmailService,
  getUserByIdService,
  updateUserAvatarService,
  updateUserService,
} from "./user.service";
import {
  CompleteUserProfileInput,
  CreateUserInput,
  UpdateUserInput,
} from "./user.validator";

const createUserController: RequestHandler = asyncHandler(async (req, res) => {
  const userData: CreateUserInput = req.body;
  // check the password

  // create the user
  const newUser = await createUserService(userData);
  if (!newUser) {
    throw new AppError(500, "Failed to create user!");
  }
  sendResponse(res, 201, "User created successfully!", newUser);
});

const getAllUsersController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const users = await getAllUsersService();
    sendResponse(res, 200, "Users retrieved successfully!", users);
  },
);

const getUserByEmailController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email } = req.params;
    if (!email) {
      throw new AppError(400, "Email is required!");
    }
    const user = await getUserByEmailService(email);
    if (!user) {
      throw new AppError(404, "User not found!");
    }
    sendResponse(res, 200, "User retrieved successfully!", user);
  },
);

const getUserByIdController: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError(400, "User ID is required!");
  }
  const user = await getUserByIdService(id);
  if (!user) {
    throw new AppError(404, "User not found!");
  }
  sendResponse(res, 200, "User retrieved successfully!", user);
});

const completeUserProfileController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    const profileData: CompleteUserProfileInput = req.body;

    const updatedUser = await completeUserProfileService(user.id, profileData);

    const jwtPayload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileStatus: updatedUser.profileStatus,
      emailVerified: updatedUser.emailVerified,
    };

    const {
      jwt: { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn },
    } = config;

    const accessToken = createToken(
      jwtPayload,
      accessSecret,
      accessExpiresIn as SignOptions["expiresIn"],
    );
    const refreshToken = createToken(
      jwtPayload,
      refreshSecret,
      refreshExpiresIn as SignOptions["expiresIn"],
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, 200, "User profile completed successfully!", {
      user: updatedUser,
      accessToken,
      refreshToken,
    });
  },
);

const updateUserController: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || !user.id) {
    throw new AppError(401, "Unauthorized");
  }
  const updateData: UpdateUserInput = req.body;
  const updatedUser = await updateUserService(user.id, updateData);
  sendResponse(res, 200, "User profile updated successfully!", updatedUser);
});
const updateUserAvatarController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    const { image }: { image: string } = req.body;
    const updatedUser = await updateUserAvatarService(user.id, image);
    sendResponse(res, 200, "User avatar updated successfully!", updatedUser);
  },
);

const deleteAccountController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }

    await deleteAccountService(user.id);
    sendResponse(res, 200, "User account deleted successfully!", null);
  },
);
const getUserProfileController: RequestHandler = asyncHandler(
  async (req, res) => {
    const user = req.user;
    if (!user || !user.id) {
      throw new AppError(401, "Unauthorized");
    }
    // change and create a separate service for this to get full profile
    const userProfile = await getCurrentUserService(user.id);
    if (!userProfile) {
      throw new AppError(404, "User not found");
    }

    sendResponse(res, 200, "User profile retrieved successfully!", userProfile);
  },
);
const getPublicProfile: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new AppError(400, "User ID is required!");
  }
  const result = await getPublicProfileService(id);
  return ResponseHandler.ok(res, "Public profile retrieved", result, {
    path: req.path,
  });
});

export {
  completeUserProfileController,
  createUserController,
  deleteAccountController,
  getAllUsersController,
  getPublicProfile,
  getUserByEmailController,
  getUserByIdController,
  getUserProfileController,
  updateUserAvatarController,
  updateUserController,
};
