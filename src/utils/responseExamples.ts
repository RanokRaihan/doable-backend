import { Request, Response } from "express";
import { IErrorSource } from "../interface/global.interface";
import ResponseHandler, { sendResponse } from "../utils/sendResponse";

/**
 * Example controller demonstrating the enhanced sendResponse utility
 * This file shows various usage patterns for the improved response system
 */

// Example 1: Using the class-based approach with OK response
export const getUserById = (_req: Request, res: Response) => {
  const user = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
  };

  return ResponseHandler.ok(res, "User retrieved successfully", user);
};

// Example 2: Using created response with path
export const createUser = (req: Request, res: Response) => {
  const newUser = {
    id: "2",
    name: "Jane Doe",
    email: "jane@example.com",
  };

  return ResponseHandler.created(
    res,
    "User created successfully",
    newUser,
    req.path
  );
};

// Example 3: Using paginated response
export const getUsers = (req: Request, res: Response) => {
  const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Doe", email: "jane@example.com" },
  ];

  const pagination = {
    total: 50,
    limit: 10,
    page: 1,
  };

  return ResponseHandler.paginated(
    res,
    "Users retrieved successfully",
    users,
    pagination,
    req.path
  );
};

// Example 4: Using validation error response
export const validateUserInput = (req: Request, res: Response) => {
  const errorSources: IErrorSource[] = [
    { path: "email", message: "Email is required" },
    { path: "name", message: "Name must be at least 2 characters" },
  ];

  return ResponseHandler.validationError(
    res,
    "Validation failed",
    errorSources,
    req.path
  );
};

// Example 5: Using custom error response
export const handleCustomError = (req: Request, res: Response) => {
  return ResponseHandler.error(res, 400, "Custom error occurred", {
    path: req.path,
    errorType: "CUSTOM_ERROR",
    errorDetails: "This is a detailed error description",
    errorSources: [{ path: "general", message: "Something went wrong" }],
  });
};

// Example 6: Using not found response
export const userNotFound = (req: Request, res: Response) => {
  return ResponseHandler.notFound(res, "User not found", req.path);
};

// Example 7: Using unauthorized response
export const unauthorizedAccess = (req: Request, res: Response) => {
  return ResponseHandler.unauthorized(res, "Invalid token provided", req.path);
};

// Example 8: Using internal server error with stack trace (development only)
export const serverError = (req: Request, res: Response) => {
  return ResponseHandler.internalServerError(
    res,
    "Database connection failed",
    {
      path: req.path,
      errorDetails: "Unable to connect to the database",
      includeStack: true,
    }
  );
};

// Example 9: Using no content response for delete operations
export const deleteUser = (req: Request, res: Response) => {
  return ResponseHandler.noContent(res, req.path);
};

// Example 10: Using the legacy sendResponse function (backward compatibility)
export const legacyResponse = (_req: Request, res: Response) => {
  const user = { id: "1", name: "John Doe" };

  const meta = {
    total: 1,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return sendResponse(res, 200, "User found", user, meta);
};

// Example 11: Using conflict response
export const duplicateUser = (req: Request, res: Response) => {
  return ResponseHandler.conflict(
    res,
    "User with this email already exists",
    req.path
  );
};

// Example 12: Using forbidden response
export const forbiddenAccess = (req: Request, res: Response) => {
  return ResponseHandler.forbidden(
    res,
    "You don't have permission to access this resource",
    req.path
  );
};

// Example 13: Using unprocessable entity for validation
export const invalidData = (req: Request, res: Response) => {
  const errorSources: IErrorSource[] = [
    { path: "age", message: "Age must be between 18 and 100" },
    {
      path: "password",
      message: "Password must contain at least one special character",
    },
  ];

  return ResponseHandler.unprocessableEntity(
    res,
    "Invalid user data provided",
    errorSources,
    req.path
  );
};

// Example 14: Using rate limit response
export const rateLimitExceeded = (req: Request, res: Response) => {
  return ResponseHandler.tooManyRequests(
    res,
    "Too many requests. Please try again later.",
    req.path
  );
};

// Example 15: Using service unavailable response
export const serviceDown = (req: Request, res: Response) => {
  return ResponseHandler.serviceUnavailable(
    res,
    "Service is temporarily unavailable for maintenance",
    req.path
  );
};

/**
 * Advanced Usage Examples
 */

// Example 16: Dynamic response based on conditions
export const dynamicResponse = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return ResponseHandler.badRequest(res, "User ID is required", {
      path: req.path,
      errorSources: [{ path: "id", message: "ID parameter is missing" }],
    });
  }

  // Simulate database lookup
  const user = id === "1" ? { id: "1", name: "John Doe" } : null;

  if (!user) {
    return ResponseHandler.notFound(res, "User not found", req.path);
  }

  return ResponseHandler.ok(res, "User retrieved successfully", user);
};

// Example 17: Async error handling
export const asyncOperation = async (req: Request, res: Response) => {
  try {
    // Simulate async operation
    const result = await new Promise((resolve, reject) => {
      // Simulate random success/failure
      Math.random() > 0.5
        ? resolve("Success!")
        : reject(new Error("Async error"));
    });

    return ResponseHandler.ok(res, "Operation completed", { result });
  } catch (error) {
    return ResponseHandler.internalServerError(res, "Async operation failed", {
      path: req.path,
      errorDetails: error instanceof Error ? error.message : "Unknown error",
      includeStack: true,
    });
  }
};

// Example 18: Response with custom metadata
export const responseWithCustomMeta = (req: Request, res: Response) => {
  const data = [1, 2, 3, 4, 5];

  return ResponseHandler.success(res, 200, "Data retrieved", data, {
    meta: {
      total: 100,
      limit: 5,
      page: 1,
      totalPages: 20,
      hasNextPage: true,
      hasPreviousPage: false,
    },
    path: req.path,
  });
};
