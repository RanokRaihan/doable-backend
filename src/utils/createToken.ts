import jwt, { SignOptions } from "jsonwebtoken";
import { IJwtPayload } from "../modules/auth/auth.interface";
import { AppError } from "./appError";

export const createToken = (
  jwtPayload: IJwtPayload,
  secret: string,
  expiresIn?: SignOptions["expiresIn"],
): string => {
  if (!jwtPayload || typeof jwtPayload !== "object") {
    throw new AppError(400, "Invalid JWT payload");
  }

  if (!secret || typeof secret !== "string") {
    throw new AppError(400, "Invalid JWT secret");
  }

  try {
    const options: SignOptions = {
      algorithm: "HS256",
      issuer: process.env.JWT_ISSUER || "Doable-app",
    };

    if (expiresIn) {
      options.expiresIn = expiresIn;
    }

    const token = jwt.sign(jwtPayload, secret, options);

    if (!token) {
      throw new AppError(500, "Token generation returned empty result");
    }

    return token;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      500,
      `Token creation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};
