import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

const validateRequest = (schema: ZodObject<any>) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      await schema.parseAsync({
        body: req.body ?? {},
        params: req.params ?? {},
        query: req.query ?? {},
      });

      next();
    },
  );
};

export default validateRequest;
