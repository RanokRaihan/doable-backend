// Global error handling middleware
import { NextFunction, Request, Response } from "express";
import { IErrorSource } from "../interface/global.interface";
import ResponseHandler from "../utils/sendResponse";

/**
 * Enhanced error handling middleware using the new response utility
 * This replaces the basic error handler and provides consistent error responses
 */

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public errorType: string;
  public errorSources?: IErrorSource[];
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorType: string = "APPLICATION_ERROR",
    errorSources?: IErrorSource[],
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    if (errorSources) {
      this.errorSources = errorSources;
    }
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class for Zod validation errors
export class ValidationError extends AppError {
  constructor(message: string, errorSources: IErrorSource[]) {
    super(422, message, "VALIDATION_ERROR", errorSources);
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, message, "NOT_FOUND_ERROR");
  }
}

// Conflict error class
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(409, message, "CONFLICT_ERROR");
  }
}

/**
 * Global error handling middleware
 * Handles all errors thrown in the application and sends consistent responses
 */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Error occurred:", error);

  // Handle known application errors
  if (error instanceof AppError) {
    const options: any = {
      path: req.path,
      errorType: error.errorType,
      includeStack:
        process.env.NODE_ENV === "development" && !error.isOperational,
    };

    if (error.errorSources) {
      options.errorSources = error.errorSources;
    }

    ResponseHandler.error(res, error.statusCode, error.message, options);
    return;
  }

  // Handle Zod validation errors
  if (error.name === "ZodError") {
    const zodError = error as any;
    const errorSources: IErrorSource[] = zodError.errors.map((err: any) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    ResponseHandler.validationError(
      res,
      "Request validation failed",
      errorSources,
      req.path
    );
    return;
  }

  // Handle Prisma errors
  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        ResponseHandler.conflict(
          res,
          "A record with this information already exists",
          req.path
        );
        return;

      case "P2025":
        ResponseHandler.notFound(
          res,
          "The requested record was not found",
          req.path
        );
        return;

      default:
        ResponseHandler.internalServerError(res, "Database operation failed", {
          path: req.path,
          errorDetails: prismaError.message,
          includeStack: process.env.NODE_ENV === "development",
        });
        return;
    }
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    ResponseHandler.unauthorized(res, "Invalid authentication token", req.path);
    return;
  }

  if (error.name === "TokenExpiredError") {
    ResponseHandler.unauthorized(
      res,
      "Authentication token has expired",
      req.path
    );
    return;
  }

  // Handle multer errors (file upload)
  if (error.name === "MulterError") {
    const multerError = error as any;

    switch (multerError.code) {
      case "LIMIT_FILE_SIZE":
        ResponseHandler.badRequest(res, "File size too large", {
          path: req.path,
          errorSources: [
            { path: "file", message: "File exceeds maximum size limit" },
          ],
        });
        return;

      case "LIMIT_FILE_COUNT":
        ResponseHandler.badRequest(res, "Too many files", {
          path: req.path,
          errorSources: [
            { path: "files", message: "Exceeded maximum file count" },
          ],
        });
        return;

      default:
        ResponseHandler.badRequest(res, "File upload error", {
          path: req.path,
          errorDetails: multerError.message,
        });
        return;
    }
  }

  // Handle syntax errors in request body
  if (error instanceof SyntaxError && "body" in error) {
    ResponseHandler.badRequest(res, "Invalid JSON in request body", {
      path: req.path,
      errorSources: [
        { path: "body", message: "Request body contains invalid JSON" },
      ],
    });
    return;
  }

  // Handle unknown errors
  const options: any = {
    path: req.path,
    includeStack: process.env.NODE_ENV === "development",
  };

  if (process.env.NODE_ENV === "development") {
    options.errorDetails = error.message;
  }

  ResponseHandler.internalServerError(
    res,
    "An unexpected error occurred",
    options
  );
};

/**
 * 404 Not Found middleware
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseHandler.notFound(
    res,
    `Route ${req.method} ${req.path} not found`,
    req.path
  );
};

/**
 * Rate limiting error handler
 */
export const rateLimitHandler = (req: Request, res: Response): void => {
  ResponseHandler.tooManyRequests(
    res,
    "Too many requests from this IP, please try again later",
    req.path
  );
};

/**
 * CORS error handler
 */
export const corsErrorHandler = (req: Request, res: Response): void => {
  ResponseHandler.forbidden(res, "CORS policy violation", req.path);
};
