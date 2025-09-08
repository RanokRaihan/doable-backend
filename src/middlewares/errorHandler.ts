import { ErrorRequestHandler, RequestHandler } from "express";

import { TErrorSources } from "../interface/error.interface";
import { AppError } from "../utils";

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import config from "../config";

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next
) => {
  // define default values
  let statusCode = 500;
  let message = "something went wrong!";
  let errorType = "GENERAL_ERROR";
  let errorSources: TErrorSources = [
    {
      path: "global",
      message: "something went wrong!",
    },
  ];

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorType = "VALIDATION_ERROR";
    message = "Validation error occurred!";
    errorSources = err.issues.map((issue) => {
      return {
        path: issue?.path[issue.path.length - 1] as string,
        message: issue.message,
      };
    });
  }
  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;

    switch (err.code) {
      case "P2002":
        message = "Duplicate field value";
        errorType = "VALIDATION_ERROR";
        errorSources = [
          {
            path:
              (Array.isArray(err.meta?.target)
                ? (err.meta.target[0] as string)
                : "field") || "field",
            message: `Duplicate value for ${
              Array.isArray(err.meta?.target)
                ? err.meta.target.join(", ")
                : "field"
            }`,
          },
        ];
        break;
      case "P2025":
        message = "Record not found";
        statusCode = 404;
        errorType = "NOT_FOUND";
        errorSources = [
          {
            path: "record",
            message: "The requested record was not found",
          },
        ];
        break;
      case "P2003":
        message = "Foreign key constraint failed";
        statusCode = 400;
        errorType = "VALIDATION_ERROR";
        errorSources = [
          {
            path: (err.meta?.field_name as string) || "foreign_key",
            message: "Referenced record does not exist",
          },
        ];
        break;
      default:
        message = "Database error";
        errorType = "DATABASE_ERROR";
        errorSources = [
          {
            path: "database",
            message: err.message || "Unknown database error occurred",
          },
        ];
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid data provided";
    errorType = "VALIDATION_ERROR";
    errorSources = [
      {
        path: "validation",
        message: err.message || "Invalid data provided to database",
      },
    ];
  }

  //apiError handler
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorType = err.errorType;

    errorSources = [
      {
        path: err?.path || "global",
        message: err.message,
      },
    ];
  }

  // Log error in production
  if (config.nodeEnv === "production") {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  //   return response
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    errorType,
    errorSources,
    stack: config.nodeEnv === "development" ? err?.stack : null,
  });
};

export const notFoundHandler: RequestHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found`,
    statusCode: 404,
    errorSources: [
      {
        path: req.originalUrl,
        message: `Route '${req.originalUrl}' does not exist`,
      },
    ],
    stack: config.nodeEnv === "development" ? null : undefined,
  });
};
