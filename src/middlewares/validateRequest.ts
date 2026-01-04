import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";
import { AppError } from "../utils";
import { asyncHandler } from "../utils/asyncHandler";

const validateRequest = (
  schema: ZodObject<any>,
  checkParams: boolean = false
) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.body) {
        return next(
          new AppError(400, "Request body is missing!", "VALIDATION_ERROR")
        );
      }
      if (checkParams && !req.params) {
        return next(
          new AppError(400, "Request params are missing!", "VALIDATION_ERROR")
        );
      }
      await schema.parseAsync({
        body: req.body,
      });
      if (checkParams) {
        await schema.parseAsync({
          params: req.params,
        });
      }
      next();
    }
  );
};

export default validateRequest;
