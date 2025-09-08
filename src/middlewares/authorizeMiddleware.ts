import { NextFunction, Request, Response } from "express";

import { UserRole } from "@prisma/client";
import { AppError } from "../utils";
import { asyncHandler } from "../utils/asyncHandler";

export const authorize = (roles: UserRole[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        console.log("User not found");
        throw new AppError(401, "You are not authorized !");
      }
      if (!roles.includes(user.role)) {
        throw new AppError(401, " You are not authorized !");
      }
      next();
    }
  );
};
