import { Request, Response, Router } from "express";
import ResponseHandler from "../utils/sendResponse";

const router = Router();

/**
 * Demo routes showing the enhanced response utility in action
 * These routes demonstrate various response patterns and can be used for testing
 */

// GET /demo/success - Basic success response
router.get("/success", (_req: Request, res: Response) => {
  const data = {
    message: "This is a successful response",
    timestamp: new Date(),
  };
  return ResponseHandler.ok(res, "Operation completed successfully", data);
});

// GET /demo/created - Resource creation response
router.post("/created", (req: Request, res: Response) => {
  const newResource = {
    id: "123",
    name: "New Resource",
    createdAt: new Date(),
  };
  return ResponseHandler.created(
    res,
    "Resource created successfully",
    newResource,
    req.path
  );
});

// GET /demo/paginated - Paginated response
router.get("/paginated", (req: Request, res: Response) => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
  }));

  const pagination = {
    total: 50,
    limit: 5,
    page: 1,
  };

  return ResponseHandler.paginated(
    res,
    "Items retrieved successfully",
    items,
    pagination,
    req.path
  );
});

// GET /demo/not-found - Not found error
router.get("/not-found", (req: Request, res: Response) => {
  return ResponseHandler.notFound(
    res,
    "The requested resource was not found",
    req.path
  );
});

// GET /demo/validation-error - Validation error with sources
router.post("/validation-error", (req: Request, res: Response) => {
  const errorSources = [
    { path: "email", message: "Email is required and must be valid" },
    {
      path: "password",
      message: "Password must be at least 8 characters long",
    },
    { path: "age", message: "Age must be between 18 and 120" },
  ];

  return ResponseHandler.validationError(
    res,
    "Request validation failed",
    errorSources,
    req.path
  );
});

// GET /demo/unauthorized - Unauthorized error
router.get("/unauthorized", (req: Request, res: Response) => {
  return ResponseHandler.unauthorized(
    res,
    "Authentication token is missing or invalid",
    req.path
  );
});

// GET /demo/forbidden - Forbidden error
router.get("/forbidden", (req: Request, res: Response) => {
  return ResponseHandler.forbidden(
    res,
    "You don't have permission to access this resource",
    req.path
  );
});

// GET /demo/conflict - Conflict error
router.get("/conflict", (req: Request, res: Response) => {
  return ResponseHandler.conflict(
    res,
    "A resource with this identifier already exists",
    req.path
  );
});

// GET /demo/server-error - Internal server error
router.get("/server-error", (req: Request, res: Response) => {
  return ResponseHandler.internalServerError(
    res,
    "An unexpected error occurred",
    {
      path: req.path,
      errorDetails: "Database connection timeout",
      includeStack: true, // Will only show in development
    }
  );
});

// GET /demo/custom-error - Custom error with all options
router.get("/custom-error", (req: Request, res: Response) => {
  return ResponseHandler.error(res, 418, "I'm a teapot", {
    path: req.path,
    errorType: "TEAPOT_ERROR",
    errorDetails: "This server is actually a teapot and cannot brew coffee",
    errorSources: [{ path: "beverage", message: "Only tea is supported" }],
    includeStack: false,
  });
});

// DELETE /demo/no-content - No content response
router.delete("/no-content", (req: Request, res: Response) => {
  return ResponseHandler.noContent(res, req.path);
});

// GET /demo/rate-limit - Rate limit error
router.get("/rate-limit", (req: Request, res: Response) => {
  return ResponseHandler.tooManyRequests(
    res,
    "Rate limit exceeded. Please try again later.",
    req.path
  );
});

// GET /demo/service-unavailable - Service unavailable error
router.get("/service-unavailable", (req: Request, res: Response) => {
  return ResponseHandler.serviceUnavailable(
    res,
    "Service is temporarily unavailable for maintenance",
    req.path
  );
});

// GET /demo/unprocessable - Unprocessable entity error
router.post("/unprocessable", (req: Request, res: Response) => {
  const errorSources = [
    { path: "creditCard", message: "Credit card number is invalid" },
    { path: "expiryDate", message: "Expiry date must be in the future" },
  ];

  return ResponseHandler.unprocessableEntity(
    res,
    "Payment information is invalid",
    errorSources,
    req.path
  );
});

export default router;
