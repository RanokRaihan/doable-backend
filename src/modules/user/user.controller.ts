import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import { getCurrentUserService } from "../auth/auth.service";
import {
  completeUserProfileService,
  createUserService,
  deleteAccountService,
  getAllUsersService,
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
    sendResponse(res, 200, "User profile completed successfully!", updatedUser);
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
export {
  completeUserProfileController,
  createUserController,
  deleteAccountController,
  getAllUsersController,
  getUserByEmailController,
  getUserByIdController,
  getUserProfileController,
  updateUserAvatarController,
  updateUserController,
};
