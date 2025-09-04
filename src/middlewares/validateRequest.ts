import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";
import { AppError } from "../utils";
import { asyncHandler } from "../utils/asyncHandler";

const validateRequest = (schema: ZodObject<any>) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.body) {
        return next(
          new AppError(400, "Request body is missing!", "VALIDATION_ERROR")
        );
      }
      await schema.parseAsync({
        body: req.body,
      });
      next();
    }
  );
};

export default validateRequest;
