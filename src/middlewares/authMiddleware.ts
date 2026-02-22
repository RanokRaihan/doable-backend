import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import { IJwtPayload } from "../modules/auth/auth.interface";
import { getAuthUser } from "../modules/auth/auth.service";
import { AppError, asyncHandler } from "../utils";

// Constants for better maintainability
const ERROR_MESSAGES = {
  UNAUTHORIZED: "You are not authorized",
  USER_NOT_FOUND: "User not found",
  ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support",
} as const;

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
} as const;

export const auth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Extract token with optional chaining
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Verify token with proper error handling
    let decoded: IJwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret) as IJwtPayload;
    } catch (error) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Get user and validate existence
    const user = await getAuthUser(decoded.userId);
    if (!user || user.isDeleted) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check account status
    if (user.profileStatus === "SUSPENDED") {
      throw new AppError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.ACCOUNT_SUSPENDED,
      );
    }

    // Attach user to request and proceed
    req.user = user;
    next();
  },
);
