import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import config from "../../config";
import { prisma } from "../../config/database";
import { AppError, sendEmail } from "../../utils";
import { createToken } from "../../utils/createToken";
import { getTimeRemaining } from "../../utils/time";
import { IJwtPayload, UserLoginInput } from "./auth.interface";

const {
  jwt: { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn },
} = config;

const loginUserService = async (loginData: UserLoginInput) => {
  try {
    const { email, password } = loginData;

    // Get user with password for validation
    const userWithPassword = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        image: true,
        provider: true,
        profileStatus: true,
        emailVerified: true,
        isDeleted: true,
        lockedAt: true,
        failedLoginCount: true,
      },
    });

    if (!userWithPassword || userWithPassword.isDeleted) {
      throw new AppError(400, "Invalid credentials", "AUTHENTICATION_ERROR");
    }

    if (
      !userWithPassword.password ||
      userWithPassword.provider !== "CREDENTIALS"
    ) {
      throw new AppError(
        400,
        "Login Method not supported! Please use a different method.",
        "AUTHENTICATION_ERROR",
      );
    }

    // Check if account is locked
    if (userWithPassword.lockedAt) {
      throw new AppError(
        423,
        "Account is locked. Please contact support.",
        "ACCOUNT_LOCKED",
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password,
    );
    if (!isPasswordValid) {
      // Increment failed login count
      await incrementFailedLoginCount(
        userWithPassword.id,
        userWithPassword.failedLoginCount,
      );

      throw new AppError(400, "Invalid credentials", "AUTHENTICATION_ERROR");
    }

    // Reset failed login count and update last login
    await resetFailedLoginCount(userWithPassword.id);

    // Create JWT payload
    const jwtPayload: IJwtPayload = {
      userId: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      role: userWithPassword.role,
      profileStatus: userWithPassword.profileStatus,
    };

    // Generate tokens
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

    // Return clean user data without password
    const userData = {
      id: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      role: userWithPassword.role,
      profileStatus: userWithPassword.profileStatus,
      image: userWithPassword.image,
    };

    return {
      user: userData,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Error in loginUserService:", error);
    throw error;
  }
};

// Get current user by ID
const getCurrentUserService = async (userId: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileStatus: true,
        provider: true,
        image: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    return user;
  } catch (error) {
    console.error("Error in getCurrentUserService:", error);
    throw error;
  }
};
// Get current user by ID
const getAuthUser = async (userId: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileStatus: true,
        isDeleted: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    return user;
  } catch (error) {
    console.error("Error in getAuthUserService:", error);
    throw error;
  }
};

// Change user password
const changeUserPasswordService = async (
  userEmail: string,
  oldPassword: string,
  newPassword: string,
) => {
  try {
    // Get user with password
    const user = await prisma.user.findFirst({
      where: { email: userEmail.toLowerCase().trim(), isDeleted: false },
      select: {
        id: true,
        email: true,
        password: true,
        provider: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    if (!user.password || user.provider !== "CREDENTIALS") {
      throw new AppError(
        400,
        "Password change not allowed for this account type",
        "OPERATION_NOT_ALLOWED",
      );
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AppError(
        401,
        "Current password is incorrect",
        "AUTHENTICATION_ERROR",
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return true;
  } catch (error) {
    console.error("Error in changeUserPasswordService:", error);
    throw error;
  }
};

// Increment failed login count and lock account if necessary
const incrementFailedLoginCount = async (
  userId: string,
  failedLoginCount: number,
) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: failedLoginCount + 1,
        // Lock account after 5 failed attempts
        //for testting set to 40, change to 5 later
        ...(failedLoginCount >= 40 && {
          lockedAt: new Date(),
        }),
      },
    });
  } catch (error) {
    console.error("Error in incrementFailedLoginCount:", error);
    throw new Error("Failed to update failed login count");
  }
};

// Reset failed login count and update last login
const resetFailedLoginCount = async (userId: string) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedAt: null,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error in resetFailedLoginCount:", error);
    throw new Error("Failed to reset failed login count");
  }
};

const forgotPasswordService = async (email: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
      select: {
        id: true,
        email: true,
        provider: true,
      },
    });

    if (!user) {
      // Don't reveal whether user exists or not for security
      return "If an account with this email exists, a password reset link has been sent.";
    }

    if (user.provider !== "CREDENTIALS") {
      throw new AppError(
        400,
        "Password reset not available for this account type",
        "OPERATION_NOT_ALLOWED",
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save to DB with 15 minute expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      },
    });

    // Send email with reset link in production

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${config.frontendUrl}/reset-password?token=${resetToken}&email=${user.email}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    if (config.nodeEnv === "development") {
      console.log(`Reset token for ${email}: ${resetToken}`);
    }

    return "Password reset email sent successfully";
  } catch (error) {
    console.error("Error in forgotPasswordService:", error);
    throw error;
  }
};

// Reset password using reset token
const resetPasswordService = async (
  email: string,
  newPassword: string,
  resetToken: string,
) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
      select: {
        id: true,
        email: true,
        provider: true,
        passwordResetToken: true,
        passwordResetAt: true,
      },
    });

    if (!user) {
      throw new AppError(
        400,
        "Invalid or expired reset token",
        "INVALID_TOKEN",
      );
    }

    // Verify reset token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    if (user.passwordResetToken !== hashedToken) {
      throw new AppError(
        400,
        "Invalid or expired reset token",
        "INVALID_TOKEN",
      );
    }

    if (user.passwordResetAt && user.passwordResetAt < new Date()) {
      throw new AppError(400, "Reset token has expired", "TOKEN_EXPIRED");
    }

    // Hash new password and update user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetAt: null,
        // Reset failed login count when password is reset
        failedLoginCount: 0,
        lockedAt: null,
      },
    });

    return true;
  } catch (error) {
    console.error("Error in resetPasswordService:", error);
    throw error;
  }
};

const refreshAuthTokenService = async (token: string) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(token, refreshSecret) as IJwtPayload;

    if (!decoded || !decoded.userId) {
      throw new AppError(401, "Invalid refresh token", "AUTHENTICATION_ERROR");
    }

    // Get user to ensure they still exist
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileStatus: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    // Create new JWT payload
    const jwtPayload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileStatus: user.profileStatus,
    };

    // Generate new access token
    const newAccessToken = createToken(
      jwtPayload,
      accessSecret,
      accessExpiresIn as SignOptions["expiresIn"],
    );
    const newRefreshToken = createToken(
      jwtPayload,
      refreshSecret,
      refreshExpiresIn as SignOptions["expiresIn"],
    );
    return {
      newAccessToken,
      newRefreshToken,
    };
  } catch (error) {
    console.error("Error in refreshAuthTokenService:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, "Invalid refresh token", "AUTHENTICATION_ERROR");
    }
    throw error;
  }
};

// email verification services
const sendVerificationEmailService = async (email: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    if (user.emailVerified) {
      throw new AppError(400, "Email is already verified", "ALREADY_VERIFIED");
    }
    if (user.provider !== "CREDENTIALS") {
      throw new AppError(
        400,
        "Email verification not available for this account type",
        "OPERATION_NOT_ALLOWED",
      );
    }
    if (
      user.emailVerificationToken &&
      user.emailVerificationSentAt &&
      user.emailVerificationSentAt > new Date(Date.now() - 5 * 60 * 1000)
    ) {
      const { minutes, seconds } = getTimeRemaining(
        new Date(user.emailVerificationSentAt.getTime() + 5 * 60 * 1000),
      );

      throw new AppError(
        400,
        `A verification email has already been sent. Please check your inbox. You can request a new one after ${minutes} minutes and ${seconds} seconds`,
        "ALREADY_SENT",
      );
    }
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    // Save to DB with 1 hour expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationSentAt: new Date(),
        emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      },
    });
    // Send verification email
    await sendEmail({
      to: user.email,
      subject: "Email Verification",
      html: `
        <p>Please verify your email by clicking the link below:</p>
        <a href="${config.frontendUrl}/verify-email?token=${verificationToken}">Verify Email</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not create an account, please ignore this email.</p>
      `,
    });
    if (config.nodeEnv === "development") {
      console.log(`Verification token for ${email}: ${verificationToken}`);
    }
  } catch (error) {
    console.error("Error in sendVerificationEmailService:", error);
    throw error;
  }
};

// Verify email with token
const verifyEmailService = async (rawToken: string) => {
  try {
    // Hash the incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Find user with matching token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiresAt: {
          gt: new Date(), // Token not expired
        },
        isDeleted: false,
      },
    });

    // Token not found or expired
    if (!user) {
      throw new AppError(
        400,
        "Invalid or expired verification link",
        "TOKEN_INVALID",
      );
    }

    // Already verified
    if (user.emailVerified) {
      throw new AppError(400, "Email already verified", "ALREADY_VERIFIED");
    }

    // Update user - mark as verified and clear token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationSentAt: null,
        emailVerificationExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error in verifyEmailService:", error);
    throw error;
  }
};

// Exports
export {
  changeUserPasswordService,
  forgotPasswordService,
  getAuthUser,
  getCurrentUserService,
  incrementFailedLoginCount,
  loginUserService,
  refreshAuthTokenService,
  resetFailedLoginCount,
  resetPasswordService,
  sendVerificationEmailService,
  verifyEmailService,
};
