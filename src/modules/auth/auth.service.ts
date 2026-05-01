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
      const lockTime = new Date(userWithPassword.lockedAt).getTime();
      const currentTime = new Date().getTime();
      const lockDurationMs = 15 * 60 * 1000; // 15 minutes in milliseconds

      if (currentTime - lockTime < lockDurationMs) {
        throw new AppError(
          423,
          "Too many failed login attempts. Please try again later or reset your password.",
          "ACCOUNT_LOCKED",
        );
      }

      // Lock period expired, unlock the account
      await resetFailedLoginCount(userWithPassword.id);
    }
    if (userWithPassword.lockedAt) {
      throw new AppError(
        423,
        "Too many failed login attempts. Please try again later or reset your password.",
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
      emailVerified: userWithPassword.emailVerified,
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
        address: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        bio: true,
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
        ...(failedLoginCount >= 5 && {
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

    // The unified response returned to the controller to prevent email enumeration
    const genericResponse =
      "If an account with this email exists, a password reset link has been sent.";

    // Shared email styles for a clean, responsive, and modern UI
    const emailStyle = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
      .header { background-color: #09090b; padding: 24px; text-align: center; }
      .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
      .content { padding: 32px; color: #3f3f46; line-height: 1.6; font-size: 16px; }
      .button-container { text-align: center; margin: 32px 0; }
      .button { background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; transition: background-color 0.2s; }
      .footer { padding: 24px; text-align: center; font-size: 14px; color: #71717a; background-color: #fafafa; border-top: 1px solid #e4e4e7; }
    `;

    if (!user) {
      // Scenario 1: Email is not in the database
      await sendEmail({
        to: email, // Use the input email since user doesn't exist
        subject: "Password Reset Request - Doable",
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${emailStyle}</style></head>
          <body>
            <div class="container">
              <div class="header"><h1>Doable</h1></div>
              <div class="content">
                <p>Hello,</p>
                <p>We recently received a request to reset the password for an account associated with this email address.</p>
                <p>However, we couldn't find an existing Doable account registered with this email. If you'd like to join the platform, you can create a new account below.</p>
                <div class="button-container">
                  <a href="${config.frontendUrl}/register" class="button">Create an Account</a>
                </div>
                <p>If you didn't make this request, you can safely ignore this email.</p>
              </div>
              <div class="footer">&copy; ${new Date().getFullYear()} Doable. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
      });
      return genericResponse;
    }

    if (user.provider !== "CREDENTIALS") {
      // Scenario 2: Account exists, but they sign in via Google
      await sendEmail({
        to: user.email,
        subject: "Doable Login Information",
        html: `
          <!DOCTYPE html>
          <html>
          <head><style>${emailStyle}</style></head>
          <body>
            <div class="container">
              <div class="header"><h1>Doable</h1></div>
              <div class="content">
                <p>Hello,</p>
                <p>You recently requested a password reset for your Doable account. However, this email is associated with a Google login rather than a standard password.</p>
                <p>To access your account, please return to the login page and continue with Google.</p>
                <div class="button-container">
                  <a href="${config.frontendUrl}/login" class="button">Log In with Google</a>
                </div>
                <p>If you didn't make this request, please ensure your Google account is secure.</p>
              </div>
              <div class="footer">&copy; ${new Date().getFullYear()} Doable. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
      });
      return genericResponse;
    }

    // Scenario 3: Standard password reset flow for valid CREDENTIALS users
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password - Doable",
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>${emailStyle}</style></head>
        <body>
          <div class="container">
            <div class="header"><h1>Doable</h1></div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your Doable account. You can reset it by clicking the button below:</p>
              <div class="button-container">
                <a href="${config.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}" class="button">Reset Password</a>
              </div>
              <p><strong>Note:</strong> This link will expire in 15 minutes for your security.</p>
              <p>If you did not request a password reset, no further action is required and your password will remain the same.</p>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} Doable. All rights reserved.</div>
          </div>
        </body>
        </html>
      `,
    });

    if (config.nodeEnv === "development") {
      console.log(`Reset token for ${email}: ${resetToken}`);
    }

    return genericResponse;
  } catch (error) {
    console.error("Error in forgotPasswordService:", error);
    throw error;
  }
};
// getEmail verification data for logged in user
const getEmailVerificationDataService = async (userEmail: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: userEmail.toLowerCase().trim(), isDeleted: false },
      select: {
        emailVerified: true,
        emailVerifiedAt: true,
        emailVerificationSentAt: true,
        emailVerificationExpiresAt: true,
      },
    });
    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }
    return {
      emailVerified: user.emailVerified,
      emailVerificationSentAt: user.emailVerificationSentAt,
      emailVerificationExpiresAt: user.emailVerificationExpiresAt,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  } catch (error) {
    console.error("Error in getEmailVerificationDataService:", error);
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
        emailVerified: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "NOT_FOUND");
    }

    // Create new JWT payload
    const jwtPayload: IJwtPayload = {
      emailVerified: user.emailVerified,
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
      user.emailVerificationSentAt > new Date(Date.now() - 1 * 60 * 1000)
    ) {
      const { minutes, seconds } = getTimeRemaining(
        new Date(user.emailVerificationSentAt.getTime() + 1 * 60 * 1000),
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
        role: true,
        profileStatus: true,
        emailVerified: true,
      },
    });

    // Generate new tokens with emailVerified: true
    const jwtPayload: IJwtPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      profileStatus: updatedUser.profileStatus,
    };

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

    return {
      user: updatedUser,
      accessToken,
      refreshToken,
    };
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
  getEmailVerificationDataService,
  incrementFailedLoginCount,
  loginUserService,
  refreshAuthTokenService,
  resetFailedLoginCount,
  resetPasswordService,
  sendVerificationEmailService,
  verifyEmailService,
};
