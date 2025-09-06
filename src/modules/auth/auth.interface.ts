import { UserRole } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
export interface IJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  name: string;
  userRole: UserRole;
  iat?: number;
  exp?: number;
}
