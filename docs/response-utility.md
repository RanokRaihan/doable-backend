# Enhanced Response Utility Documentation

This document explains the improved `sendResponse` utility and global interfaces that provide a consistent, type-safe way to handle API responses in your Express.js application.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Response Structure](#response-structure)
4. [Usage Examples](#usage-examples)
5. [Migration Guide](#migration-guide)
6. [Type Definitions](#type-definitions)
7. [Best Practices](#best-practices)

## Overview

The enhanced response utility provides:

- **Consistent Response Format**: Standardized structure across all API endpoints
- **Type Safety**: Full TypeScript support with strict typing
- **Error Handling**: Comprehensive error response structure
- **HTTP Status Helpers**: Predefined methods for common HTTP status codes
- **Pagination Support**: Built-in pagination metadata
- **Development Features**: Stack traces in development mode

## Key Features

### 1. Class-Based Response Handler

The new `ResponseHandler` class provides static methods for common response patterns:

```typescript
import ResponseHandler from "../utils/sendResponse";

// Success responses
ResponseHandler.ok(res, "Success", data);
ResponseHandler.created(res, "Created", newResource);
ResponseHandler.noContent(res);

// Error responses
ResponseHandler.badRequest(res, "Invalid input");
ResponseHandler.notFound(res, "Resource not found");
ResponseHandler.internalServerError(res, "Server error");
```

### 2. Enhanced Type Safety

All response methods are fully typed with TypeScript:

```typescript
// Type-safe success response
const response: Response<ISuccessResponse<User>> = ResponseHandler.ok(
  res,
  "User found",
  user
);

// Type-safe error response
const errorResponse: Response<IErrorResponse> = ResponseHandler.notFound(
  res,
  "User not found"
);
```

### 3. Comprehensive Error Structure

Error responses include detailed information:

```typescript
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "timestamp": "2024-08-31T10:30:00.000Z",
  "path": "/api/users",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": "Input validation failed",
    "errorSources": [
      { "path": "email", "message": "Email is required" },
      { "path": "name", "message": "Name must be at least 2 characters" }
    ]
  }
}
```

## Response Structure

### Success Response

```typescript
interface ISuccessResponse<T> {
  success: true;
  message: string;
  statusCode: number;
  timestamp: string;
  data: T;
  meta?: IPagination; // For paginated responses
  path?: string; // Request path (optional)
}
```

### Error Response

```typescript
interface IErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  error: {
    type: string;
    details?: string;
    errorSources?: IErrorSource[];
    stack?: string; // Only in development
  };
}
```

### Pagination Metadata

```typescript
interface IPagination {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

## Usage Examples

### Basic Success Response

```typescript
export const getUser = (req: Request, res: Response) => {
  const user = { id: "1", name: "John Doe", email: "john@example.com" };
  return ResponseHandler.ok(res, "User retrieved successfully", user);
};
```

### Paginated Response

```typescript
export const getUsers = (req: Request, res: Response) => {
  const users = [
    /* user array */
  ];
  const pagination = { total: 100, limit: 10, page: 1 };

  return ResponseHandler.paginated(
    res,
    "Users retrieved successfully",
    users,
    pagination,
    req.path
  );
};
```

### Validation Error Response

```typescript
export const validateUser = (req: Request, res: Response) => {
  const errors = [
    { path: "email", message: "Email is required" },
    { path: "name", message: "Name is too short" },
  ];

  return ResponseHandler.validationError(
    res,
    "Validation failed",
    errors,
    req.path
  );
};
```

### Custom Error Response

```typescript
export const customError = (req: Request, res: Response) => {
  return ResponseHandler.error(res, 400, "Custom error", {
    path: req.path,
    errorType: "BUSINESS_LOGIC_ERROR",
    errorDetails: "Detailed error description",
    errorSources: [{ path: "general", message: "Business rule violated" }],
  });
};
```

## HTTP Status Code Helper Methods

The utility provides convenient methods for common HTTP status codes:

### Success Responses (2xx)

- `ok(res, message, data, options?)` - 200 OK
- `created(res, message, data, path?)` - 201 Created
- `noContent(res, path?)` - 204 No Content

### Client Error Responses (4xx)

- `badRequest(res, message?, options?)` - 400 Bad Request
- `unauthorized(res, message?, path?)` - 401 Unauthorized
- `forbidden(res, message?, path?)` - 403 Forbidden
- `notFound(res, message?, path?)` - 404 Not Found
- `conflict(res, message?, path?)` - 409 Conflict
- `unprocessableEntity(res, message?, errorSources?, path?)` - 422 Unprocessable Entity
- `tooManyRequests(res, message?, path?)` - 429 Too Many Requests

### Server Error Responses (5xx)

- `internalServerError(res, message?, options?)` - 500 Internal Server Error
- `serviceUnavailable(res, message?, path?)` - 503 Service Unavailable

## Migration Guide

### From Old sendResponse to New ResponseHandler

**Old Way:**

```typescript
import { sendResponse } from "../utils/sendResponse";

return sendResponse(res, 200, "Success", data, meta);
```

**New Way:**

```typescript
import ResponseHandler from "../utils/sendResponse";

return ResponseHandler.ok(res, "Success", data, { meta });
```

### Backward Compatibility

The original `sendResponse` function is still available for backward compatibility:

```typescript
import { sendResponse } from "../utils/sendResponse";

// This still works
return sendResponse(res, 200, "Success", data, meta);
```

## Type Definitions

### Core Interfaces

```typescript
interface IErrorSource {
  path: string | number;
  message: string;
}

interface IPagination {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ISuccessOptions {
  meta?: IPagination;
  path?: string;
}

interface IErrorOptions {
  path?: string;
  errorType?: string;
  errorDetails?: string;
  errorSources?: IErrorSource[];
  includeStack?: boolean;
}
```

## Best Practices

### 1. Use Appropriate HTTP Status Codes

```typescript
// For successful creation
return ResponseHandler.created(res, "User created", newUser, req.path);

// For validation errors
return ResponseHandler.unprocessableEntity(
  res,
  "Invalid data",
  errors,
  req.path
);

// For not found resources
return ResponseHandler.notFound(res, "User not found", req.path);
```

### 2. Include Request Path for Better Debugging

```typescript
return ResponseHandler.error(res, 400, "Error occurred", {
  path: req.path, // Include the request path
  errorType: "VALIDATION_ERROR",
});
```

### 3. Use Pagination for List Endpoints

```typescript
export const getUsers = (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const { users, total } = await userService.getUsers(
    Number(page),
    Number(limit)
  );

  return ResponseHandler.paginated(
    res,
    "Users retrieved successfully",
    users,
    { total, limit: Number(limit), page: Number(page) },
    req.path
  );
};
```

### 4. Consistent Error Messages

```typescript
// Use consistent error types
const ERROR_TYPES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  BUSINESS_LOGIC_ERROR: "BUSINESS_LOGIC_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
};
```

### 5. Handle Async Errors Properly

```typescript
export const asyncOperation = async (req: Request, res: Response) => {
  try {
    const result = await someAsyncOperation();
    return ResponseHandler.ok(res, "Operation successful", result);
  } catch (error) {
    return ResponseHandler.internalServerError(res, "Operation failed", {
      path: req.path,
      errorDetails: error instanceof Error ? error.message : "Unknown error",
      includeStack: process.env.NODE_ENV === "development",
    });
  }
};
```

## Environment-Specific Features

### Development Mode

- Stack traces are included in error responses when `NODE_ENV=development`
- More detailed error information for debugging

### Production Mode

- Stack traces are omitted for security
- Sensitive error details are hidden

## Example Response Formats

### Successful User Creation

```json
{
  "success": true,
  "message": "User created successfully",
  "statusCode": 201,
  "timestamp": "2024-08-31T10:30:00.000Z",
  "path": "/api/users",
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Paginated Users List

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "statusCode": 200,
  "timestamp": "2024-08-31T10:30:00.000Z",
  "path": "/api/users",
  "data": [
    { "id": "1", "name": "John Doe", "email": "john@example.com" },
    { "id": "2", "name": "Jane Doe", "email": "jane@example.com" }
  ],
  "meta": {
    "total": 100,
    "limit": 10,
    "page": 1,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 422,
  "timestamp": "2024-08-31T10:30:00.000Z",
  "path": "/api/users",
  "error": {
    "type": "VALIDATION_ERROR",
    "errorSources": [
      { "path": "email", "message": "Email is required" },
      { "path": "name", "message": "Name must be at least 2 characters" }
    ]
  }
}
```

This enhanced response utility ensures consistency, type safety, and comprehensive error handling across your entire API while maintaining backward compatibility with existing code.
