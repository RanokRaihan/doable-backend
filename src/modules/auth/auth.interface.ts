import { UserRole } from "../../generated/prisma/enums";
import { JwtPayload } from "jsonwebtoken";
import z from "zod";
import { loginValidationSchema } from "./auth.validation";
export interface IJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: string;
  emailVerified: boolean;
  // Optional standard JWT claims
  iat?: number;
  exp?: number;
}

export type UserLoginInput = z.infer<typeof loginValidationSchema>["body"];
