import { RequestHandler } from "express";
import config from "../../config";
import {
  AppError,
  asyncHandler,
  ResponseHandler,
  sendResponse,
} from "../../utils";
import { UserLoginInput } from "./auth.interface";
import {
  changeUserPasswordService,
  forgotPasswordService,
  getCurrentUserService,
  loginUserService,
  refreshAuthTokenService,
  resetPasswordService,
  sendVerificationEmailService,
  verifyEmailService,
} from "./auth.service";

// Login controller
const loginController: RequestHandler = asyncHandler(async (req, res) => {
  const loginData: UserLoginInput = req.body;

  // Call service for business logic
  const { user, accessToken, refreshToken } = await loginUserService(loginData);

  // Set refresh token as httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return ResponseHandler.ok(
    res,
    "Login successful",
    {
      user,
      accessToken,
      refreshToken,
    },
    { path: req.path },
  );
});

// Logout controller
const logoutController: RequestHandler = asyncHandler(async (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
  });

  return ResponseHandler.ok(res, "Logout successful", null, {
    path: req.path,
  });
});

// Get current user controller
const getCurrentUserController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userId = req.user?.id;
    console.log("user", req.user);
    if (!userId) {
      return ResponseHandler.unauthorized(
        res,
        "User not authenticated",
        req.path,
      );
    }

    const user = await getCurrentUserService(userId);

    return ResponseHandler.ok(res, "User retrieved successfully", user, {
      path: req.path,
    });
  },
);

const changePasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const userEmail = req.user?.email;
    const { oldPassword, newPassword } = req.body;

    if (!userEmail) {
      return ResponseHandler.unauthorized(
        res,
        "User not authenticated",
        req.path,
      );
    }

    await changeUserPasswordService(userEmail, oldPassword, newPassword);

    return ResponseHandler.ok(res, "Password changed successfully", null, {
      path: req.path,
    });
  },
);

const forgotPasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email } = req.body;

    await forgotPasswordService(email);

    return ResponseHandler.ok(res, "Password reset email sent", null, {
      path: req.path,
    });
  },
);

const resetPasswordController: RequestHandler = asyncHandler(
  async (req, res) => {
    const { email, newPassword, resetToken } = req.body;

    await resetPasswordService(email, newPassword, resetToken);

    return ResponseHandler.ok(res, "Password reset successfully", null, {
      path: req.path,
    });
  },
);

const refreshTokenController: RequestHandler = asyncHandler(
  async (req, res) => {
    // Extract refresh token from cookies

    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return ResponseHandler.unauthorized(
        res,
        "Refresh token is missing",
        req.path,
      );
    }

    const { newAccessToken, newRefreshToken } =
      await refreshAuthTokenService(refreshToken);

    // Set new refresh token as httpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ResponseHandler.ok(
      res,
      "Token refreshed successfully",
      { accessToken: newAccessToken },
      { path: req.path },
    );
  },
);

// email verification controllers
const sendVerificationController: RequestHandler = asyncHandler(
  async (req, res) => {
    const email = req.body?.email;

    if (!email) {
      throw new AppError(400, "Email is required to send verification email");
    }

    // Call service to send verification email
    await sendVerificationEmailService(email);
    sendResponse(res, 200, "Verification email sent successfully", null);
  },
);

const verifyEmailController: RequestHandler = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new AppError(400, "Verification token is required");
  }
  // Call service to verify email
  const verifiedUser = await verifyEmailService(token);

  sendResponse(res, 200, "Email verified successfully", verifiedUser);
});

// Export all controllers
export {
  changePasswordController,
  forgotPasswordController,
  getCurrentUserController,
  loginController,
  logoutController,
  refreshTokenController,
  resetPasswordController,
  sendVerificationController,
  verifyEmailController,
};
