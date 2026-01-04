import { RequestHandler } from "express";
import { AppError, asyncHandler, sendResponse } from "../../utils";
import {
  createUserService,
  getAllUsersService,
  getUserByEmailService,
  getUserByIdService,
} from "./user.service";
import { CreateUserInput } from "./user.validator";

export const createUserController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userData: CreateUserInput = req.body;
    // check the password

    // create the user
    const newUser = await createUserService(userData);
    if (!newUser) {
      throw new AppError(500, "Failed to create user!");
    }
    sendResponse(res, 201, "User created successfully!", newUser);
  }
);

export const getAllUsersController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const users = await getAllUsersService();
    sendResponse(res, 200, "Users retrieved successfully!", users);
  }
);

export const getUserByEmailController: RequestHandler = asyncHandler(
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
  }
);

export const getUserByIdController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, "User ID is required!");
    }
    const user = await getUserByIdService(id);
    if (!user) {
      throw new AppError(404, "User not found!");
    }
    sendResponse(res, 200, "User retrieved successfully!", user);
  }
);
