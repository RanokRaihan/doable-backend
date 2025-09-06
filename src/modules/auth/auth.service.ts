import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../config/database";
import { AppError } from "../../utils";

export const getLoginUserService = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        provider: true,
        emailVerified: true,
        isDeleted: true,
        lockedAt: true,
        failedLoginCount: true,
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

export const incrementFailedLoginCount = async (
  userId: string,
  failedLoginCount: number
) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: failedLoginCount + 1,
        // Lock account after 5 failed attempts
        ...(failedLoginCount >= 4 && {
          lockedAt: new Date(),
        }),
      },
    });
  } catch (error) {
    throw error;
  }
};

export const resetFailedLoginCount = async (userId: string) => {
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
    throw error;
  }
};

export const changePasswordService = async (
  userId: string,
  newPassword: string
) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const forgotPasswordService = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        provider: true,
      },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
    }

    if (user.provider !== "CREDENTIALS") {
      throw new AppError(
        400,
        "Password reset not available for this account type",
        "NOT_ALLOWED",
        "auth"
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      },
    });

    // TODO: Send email -> reset link
    console.log(`Reset token (send via email): ${resetToken}`);

    return resetToken;
  } catch (error) {
    throw error;
  }
};

export const resetPasswordService = async (
  email: string,
  newPassword: string,
  resetToken: string
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        provider: true,
        passwordResetToken: true,
        passwordResetAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND", "user");
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
        "auth"
      );
    }

    if (user.passwordResetAt && user.passwordResetAt < new Date()) {
      throw new AppError(
        400,
        "Reset token has expired",
        "TOKEN_EXPIRED",
        "auth"
      );
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetAt: null,
      },
    });

    return true;
  } catch (error) {
    throw error;
  }
};
