import { UserRole } from "@prisma/client";
export interface IJwtPayload {
  userId: string;
  email: string;
  name: string;
  userRole: UserRole;
  iat?: number;
  exp?: number;
}
