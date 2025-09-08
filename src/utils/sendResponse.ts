import { Response } from "express";
import config from "../config";
import {
  IErrorOptions,
  IErrorResponse,
  IErrorSource,
  IPagination,
  ISuccessOptions,
  ISuccessResponse,
} from "../interface/global.interface";

// Legacy support - keeping the original function signature for backward compatibility
export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: IPagination
): Response<ISuccessResponse<T>> => {
  const options: ISuccessOptions = {};
  if (meta) {
    options.meta = meta;
  }
  return ResponseHandler.success(res, statusCode, message, data, options);
};

//  Enhanced response utility with better type safety and error handling

class ResponseHandler {
  /**
   * Send a success response
   */
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T,
    options?: ISuccessOptions
  ): Response<ISuccessResponse<T>> {
    const response: ISuccessResponse<T> = {
      success: true,
      message,
      statusCode,
      data,
      timestamp: new Date().toISOString(),
    };

    if (options?.meta) {
      response.meta = options.meta;
    }

    if (options?.path) {
      response.path = options.path;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    statusCode: number,
    message: string,
    options?: IErrorOptions
  ): Response<IErrorResponse> {
    const response: IErrorResponse = {
      success: false,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      error: {
        type: options?.errorType || "GENERAL_ERROR",
      },
    };

    if (options?.path) {
      response.path = options.path;
    }

    if (options?.errorDetails) {
      response.error.details = options.errorDetails;
    }

    if (options?.errorSources) {
      response.error.errorSources = options.errorSources;
    }

    if (options?.includeStack && config.nodeEnv === "development") {
      const stack = new Error().stack;
      if (stack) {
        response.error.stack = stack;
      }
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a validation error response
   */
  static validationError(
    res: Response,
    message: string = "Validation failed",
    errorSources: IErrorSource[],
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "VALIDATION_ERROR",
      errorSources,
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 400, message, options);
  }

  /**
   * Send paginated success response
   */
  static paginated<T>(
    res: Response,
    message: string,
    data: T[],
    pagination: {
      total: number;
      limit: number;
      page: number;
    },
    path?: string
  ): Response<ISuccessResponse<T[]>> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const meta: IPagination = {
      ...pagination,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    };

    const options: ISuccessOptions = { meta };
    if (path) {
      options.path = path;
    }

    return this.success(res, 200, message, data, options);
  }

  // HTTP Status Code Helper Methods

  /**
   * 200 OK - Success response
   */
  static ok<T>(
    res: Response,
    message: string,
    data: T,
    options?: ISuccessOptions
  ): Response<ISuccessResponse<T>> {
    return this.success(res, 200, message, data, options);
  }

  /**
   * 201 Created - Resource created successfully
   */
  static created<T>(
    res: Response,
    message: string,
    data: T,
    path?: string
  ): Response<ISuccessResponse<T>> {
    const options: ISuccessOptions = {};
    if (path) {
      options.path = path;
    }
    return this.success(res, 201, message, data, options);
  }

  /**
   * 204 No Content - Success with no response body
   */
  static noContent(res: Response, path?: string): Response {
    const response: any = {
      success: true,
      message: "Operation completed successfully",
      statusCode: 204,
      timestamp: new Date().toISOString(),
    };

    if (path) {
      response.path = path;
    }

    return res.status(204).json(response);
  }

  /**
   * 400 Bad Request - Client error
   */
  static badRequest(
    res: Response,
    message: string = "Bad Request",
    options?: Pick<IErrorOptions, "path" | "errorDetails" | "errorSources">
  ): Response<IErrorResponse> {
    const errorOptions: IErrorOptions = {
      errorType: "BAD_REQUEST",
      ...options,
    };
    return this.error(res, 400, message, errorOptions);
  }

  /**
   * 401 Unauthorized - Authentication required
   */
  static unauthorized(
    res: Response,
    message: string = "Authentication required",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "UNAUTHORIZED",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 401, message, options);
  }

  /**
   * 403 Forbidden - Access denied
   */
  static forbidden(
    res: Response,
    message: string = "Access denied",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "FORBIDDEN",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 403, message, options);
  }

  /**
   * 404 Not Found - Resource not found
   */
  static notFound(
    res: Response,
    message: string = "Resource not found",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "NOT_FOUND",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 404, message, options);
  }

  /**
   * 409 Conflict - Resource conflict
   */
  static conflict(
    res: Response,
    message: string = "Resource conflict",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "CONFLICT",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 409, message, options);
  }

  /**
   * 422 Unprocessable Entity - Validation error
   */
  static unprocessableEntity(
    res: Response,
    message: string = "Validation failed",
    errorSources?: IErrorSource[],
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "VALIDATION_ERROR",
    };

    if (path) {
      options.path = path;
    }

    if (errorSources) {
      options.errorSources = errorSources;
    }

    return this.error(res, 422, message, options);
  }

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  static tooManyRequests(
    res: Response,
    message: string = "Too many requests",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "RATE_LIMIT_EXCEEDED",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 429, message, options);
  }

  /**
   * 500 Internal Server Error - Server error
   */
  static internalServerError(
    res: Response,
    message: string = "Internal server error",
    options?: Pick<IErrorOptions, "path" | "errorDetails" | "includeStack">
  ): Response<IErrorResponse> {
    const errorOptions: IErrorOptions = {
      errorType: "INTERNAL_SERVER_ERROR",
      ...options,
    };
    return this.error(res, 500, message, errorOptions);
  }

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  static serviceUnavailable(
    res: Response,
    message: string = "Service temporarily unavailable",
    path?: string
  ): Response<IErrorResponse> {
    const options: IErrorOptions = {
      errorType: "SERVICE_UNAVAILABLE",
    };

    if (path) {
      options.path = path;
    }

    return this.error(res, 503, message, options);
  }
}

// Export the new response handler class
export default ResponseHandler;

// Named exports for convenience
export const {
  success,
  error,
  validationError,
  paginated,
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable,
} = ResponseHandler;
