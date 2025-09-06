import bcrypt from "bcryptjs";
import { RequestHandler } from "express";
import { SignOptions } from "jsonwebtoken";
import {
  AppError,
  asyncHandler,
  ResponseHandler,
  sendResponse,
} from "../../utils";
import { createToken } from "../../utils/createToken";
import { getUserByIdService } from "../user/user.service";
import { UserLoginInput } from "../user/user.validator";
import { IJwtPayload } from "./auth.interface";
import {
  changePasswordService,
  forgotPasswordService,
  getLoginUserService,
  incrementFailedLoginCount,
  resetFailedLoginCount,
  resetPasswordService,
} from "./auth.service";

import config from "../../config";

const {
  jwt: { accessSecret, refreshSecret, expiresIn, refreshExpiresIn },
} = config;

// Login controller
export const loginController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email, password }: UserLoginInput = req.body;

    // Get user with password for validation
    const userWithPassword = await getLoginUserService(email);

    if (!userWithPassword || userWithPassword.isDeleted) {
      throw new AppError(
        401,
        "Invalid credentials",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    if (
      !userWithPassword.password ||
      userWithPassword.provider !== "CREDENTIALS"
    ) {
      throw new AppError(
        401,
        "Login Method not supported! Please use a different method.",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    // Check if account is locked
    if (userWithPassword.lockedAt) {
      throw new AppError(
        423,
        "Account is locked. Please contact support.",
        "ACCOUNT_LOCKED",
        "auth"
      );
    }

    // // Check if email is verified
    // if (!userWithPassword.emailVerified) {
    //   throw new AppError(
    //     401,
    //     "Please verify your email before logging in",
    //     "EMAIL_NOT_VERIFIED",
    //     "auth"
    //   );
    // }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password
    );
    if (!isPasswordValid) {
      // Increment failed login count
      await incrementFailedLoginCount(
        userWithPassword.id,
        userWithPassword.failedLoginCount
      );

      throw new AppError(
        401,
        "Invalid credentials",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    // Reset failed login count and update last login
    await resetFailedLoginCount(userWithPassword.id);

    // Create JWT payload
    const jwtPayload: IJwtPayload = {
      userId: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      userRole: userWithPassword.role,
    };

    // Generate tokens
    const accessToken = createToken(
      jwtPayload,
      accessSecret,
      expiresIn as SignOptions["expiresIn"]
    );

    const refreshToken = createToken(
      jwtPayload,
      refreshSecret,
      refreshExpiresIn as SignOptions["expiresIn"]
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data without password
    const userData = {
      id: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      role: userWithPassword.role,
    };

    return ResponseHandler.ok(
      res,
      "Login successful",
      {
        user: userData,
        accessToken,
      },
      { path: req.path }
    );
  }
);

// Logout controller
export const logoutController: RequestHandler = asyncHandler(
  async (req, res) => {
    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return ResponseHandler.ok(res, "Logout successful", null, {
      path: req.path,
    });
  }
);

// Refresh token controller
// export const refreshTokenController: RequestHandler = asyncHandler(
//   async (req, res) => {
//     const { refreshToken } = req.cookies;

//     if (!refreshToken) {
//       throw new AppError(
//         401,
//         "Refresh token not provided",
//         "AUTHENTICATION_ERROR",
//         "auth"
//       );
//     }

//     try {
//       // Verify refresh token
//       const decoded = jwt.verify(
//         refreshToken,
//         process.env.JWT_REFRESH_SECRET || "refresh-secret"
//       ) as IJwtPayload;

//       // Check if user still exists
//       const user = await getUserByIdService(decoded.userId);
//       if (!user) {
//         throw new AppError(
//           401,
//           "User not found",
//           "AUTHENTICATION_ERROR",
//           "auth"
//         );
//       }

//       // Create new JWT payload
//       const jwtPayload: IJwtPayload = {
//         userId: user.id,
//         email: user.email,
//         name: user.name,
//         userRole: user.role,
//       };

//       // Generate new access token
//       const newAccessToken = createToken(
//         jwtPayload,
//         process.env.JWT_ACCESS_SECRET || "access-secret",
//         process.env.JWT_ACCESS_EXPIRES_IN || "15m"
//       );

//       return ResponseHandler.ok(
//         res,
//         "Token refreshed successfully",
//         {
//           accessToken: newAccessToken,
//         },
//         { path: req.path }
//       );
//     } catch (error) {
//       // Clear invalid refresh token
//       res.clearCookie("refreshToken");
//       throw new AppError(
//         401,
//         "Invalid refresh token",
//         "AUTHENTICATION_ERROR",
//         "auth"
//       );
//     }
//   }
// );

// Get current user controller
export const getCurrentUserController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(
        401,
        "User not authenticated",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    const user = await getUserByIdService(userId);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }

    return ResponseHandler.ok(res, "User retrieved successfully", user, {
      path: req.path,
    });
  }
);

export const changePasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const email = req.user?.email;
    const { oldPassword, newPassword } = req.body;

    if (!email) {
      throw new AppError(
        401,
        "User not authenticated",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    const user = await getLoginUserService(email);
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }
    if (!user.password || user.provider !== "CREDENTIALS") {
      throw new AppError(
        400,
        "current operation is not allowed",
        "NOT_ALLOWED",
        "auth"
      );
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new AppError(
        401,
        "Old password is incorrect",
        "AUTHENTICATION_ERROR",
        "auth"
      );
    }

    await changePasswordService(user.id, newPassword);

    return sendResponse(res, 200, "Password changed successfully", null);
  }
);

export const forgotPasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, "Email is required", "VALIDATION_ERROR", "auth");
    }

    // Generate password reset token
    await forgotPasswordService(email);

    return sendResponse(res, 200, "Password reset email sent", null);
  }
);

export const resetPasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email, newPassword, resetToken } = req.body;

    if (!email || !newPassword || !resetToken) {
      throw new AppError(
        400,
        "All fields are required",
        "VALIDATION_ERROR",
        "auth"
      );
    }

    // Verify reset token and reset password
    await resetPasswordService(email, newPassword, resetToken);

    return sendResponse(res, 200, "Password reset successfully", null);
  }
);
