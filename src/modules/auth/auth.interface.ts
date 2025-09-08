import { UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
export interface IJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  name: string;
  userRole: UserRole;
  profileStatus: string;
  // Optional standard JWT claims
  iat?: number;
  exp?: number;
}
