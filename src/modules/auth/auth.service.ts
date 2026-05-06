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
  const { email, password } = loginData;

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

  // ISSUE-002 fix: single lock check block handles both locked and expired cases
  if (userWithPassword.lockedAt) {
    const lockTime = new Date(userWithPassword.lockedAt).getTime();
    const currentTime = new Date().getTime();
    const lockDurationMs = 15 * 60 * 1000;

    if (currentTime - lockTime < lockDurationMs) {
      throw new AppError(
        423,
        "Too many failed login attempts. Please try again later or reset your password.",
        "ACCOUNT_LOCKED",
      );
    }

    // Lock expired — reset and fall through to password verification
    await resetFailedLoginCount(userWithPassword.id);
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    userWithPassword.password,
  );
  if (!isPasswordValid) {
    await incrementFailedLoginCount(
      userWithPassword.id,
      userWithPassword.failedLoginCount,
    );
    throw new AppError(400, "Invalid credentials", "AUTHENTICATION_ERROR");
  }

  await resetFailedLoginCount(userWithPassword.id);

  const jwtPayload: IJwtPayload = {
    userId: userWithPassword.id,
    email: userWithPassword.email,
    name: userWithPassword.name,
    role: userWithPassword.role,
    emailVerified: userWithPassword.emailVerified,
    profileStatus: userWithPassword.profileStatus,
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
};

const getCurrentUserService = async (userId: string) => {
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
};

const getAuthUser = async (userId: string) => {
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
};

const changeUserPasswordService = async (
  userEmail: string,
  oldPassword: string,
  newPassword: string,
) => {
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

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new AppError(
      401,
      "Current password is incorrect",
      "AUTHENTICATION_ERROR",
    );
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword },
  });

  return true;
};

const incrementFailedLoginCount = async (
  userId: string,
  failedLoginCount: number,
) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: failedLoginCount + 1,
      ...(failedLoginCount >= 5 && {
        lockedAt: new Date(),
      }),
    },
  });
};

const resetFailedLoginCount = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedAt: null,
      lastLoginAt: new Date(),
    },
  });
};

const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isDeleted: false },
    select: {
      id: true,
      email: true,
      provider: true,
    },
  });

  const genericResponse =
    "If an account with this email exists, a password reset link has been sent.";

  const emailStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    .header { background-color: #09090b; padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 32px; color: #3f3f46; line-height: 1.6; font-size: 16px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; transition: background-color 0.2s; }
    .footer { padding: 24px; text-align: center; font-size: 14px; color: #71717a; background-color: #fafafa; border-top: 1px solid #e4e4e7; }
  `;

  if (!user) {
    await sendEmail({
      to: email,
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
                <a href="${config.frontendUrl}/register" class="button" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;display:inline-block;">Create an Account</a>
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
                <a href="${config.frontendUrl}/login" class="button" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;display:inline-block;">Log In with Google</a>
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

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetAt: new Date(Date.now() + 15 * 60 * 1000),
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
              <a href="${config.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}" class="button" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;display:inline-block;">Reset Password</a>
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
};

const getEmailVerificationDataService = async (userEmail: string) => {
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
};

const resetPasswordService = async (
  email: string,
  newPassword: string,
  resetToken: string,
) => {
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

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetAt: null,
      failedLoginCount: 0,
      lockedAt: null,
    },
  });

  return true;
};

const refreshAuthTokenService = async (token: string) => {
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(token, refreshSecret) as IJwtPayload;
  } catch {
    throw new AppError(401, "Invalid refresh token", "AUTHENTICATION_ERROR");
  }

  if (!decoded.userId) {
    throw new AppError(401, "Invalid refresh token", "AUTHENTICATION_ERROR");
  }

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

  const jwtPayload: IJwtPayload = {
    emailVerified: user.emailVerified,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileStatus: user.profileStatus,
  };

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
};

const sendVerificationEmailService = async (email: string) => {
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

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: hashedToken,
      emailVerificationSentAt: new Date(),
      emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const emailStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    .header { background-color: #09090b; padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 32px; color: #3f3f46; line-height: 1.6; font-size: 16px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; transition: background-color 0.2s; }
    .expiry-notice { background-color: #f4f4f5; border-left: 3px solid #09090b; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #52525b; margin: 24px 0; }
    .footer { padding: 24px; text-align: center; font-size: 14px; color: #71717a; background-color: #fafafa; border-top: 1px solid #e4e4e7; }
  `;

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email Address - Doable",
    html: `
      <!DOCTYPE html>
      <html>
      <head><style>${emailStyle}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>Doable</h1></div>
          <div class="content">
            <p>Hello${user.name ? `, ${user.name}` : ""},</p>
            <p>Thanks for signing up! To get started, we just need to verify your email address. Click the button below to confirm it's really you.</p>
            <div class="button-container">
              <a href="${config.frontendUrl}/verify-email?token=${verificationToken}" class="button" style="background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;display:inline-block;">Verify Email Address</a>
            </div>
            <div class="expiry-notice">
              <strong>Note:</strong> This link will expire in <strong>1 hour</strong>. If it expires, you can request a new one from your account settings.
            </div>
            <p>If you didn't create a Doable account, you can safely ignore this email — no account will be activated without verification.</p>
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} Doable. All rights reserved.</div>
        </div>
      </body>
      </html>
    `,
  });

  if (config.nodeEnv === "development") {
    console.log(`Verification token for ${email}: ${verificationToken}`);
  }
};

const verifyEmailService = async (rawToken: string) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpiresAt: {
        gt: new Date(),
      },
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(
      400,
      "Invalid or expired verification link",
      "TOKEN_INVALID",
    );
  }

  if (user.emailVerified) {
    throw new AppError(400, "Email already verified", "ALREADY_VERIFIED");
  }

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
};

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
