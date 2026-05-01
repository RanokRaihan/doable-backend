# API Contract — Shared (Cross-Module)

Cross-cutting response envelope definitions, base pagination parameters, and gotchas that apply to all modules.

---

## Standard Response Envelopes

### Success response

Used by all controllers via `ResponseHandler.ok/created/success` or `sendResponse`.

```ts
interface ISuccessResponse<T> {
  success: true;
  message: string;
  statusCode: number;
  timestamp: string; // ISO 8601, e.g. "2025-01-23T10:30:00.000Z"
  data: T;
  path?: string; // present on most responses
  meta?: IPagination; // present on paginated responses only
}
```

Example:

```json
{
  "success": true,
  "message": "Task retrieved successfully!",
  "statusCode": 200,
  "timestamp": "2025-06-01T10:00:00.000Z",
  "path": "/all-task",
  "data": { "id": "clxyz", "title": "Fix my sink" }
}
```

### Paginated response

Same as success; `meta` is populated.

```ts
interface IPagination {
  total: number; // total matching records
  page: number; // current page
  limit: number; // page size
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

Example:

```json
{
  "success": true,
  "message": "Tasks retrieved successfully!",
  "statusCode": 200,
  "timestamp": "...",
  "data": [...],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error response — two shapes

**⚠️ Critical discrepancy:** Errors thrown via `AppError` or `ZodError` go through `globalErrorHandler` which produces a **different shape** from `ResponseHandler.error()`. Most runtime errors use the `globalErrorHandler` shape.

#### Shape A — `globalErrorHandler` (thrown errors, ZodError, Prisma errors)

```ts
{
  success: false;
  message: string;
  statusCode: number;
  errorType: string; // top-level (NOT nested under "error")
  errorSources: Array<{
    path: string | number;
    message: string;
  }>;
  stack: string | null; // only in development
}
```

Example:

```json
{
  "success": false,
  "message": "Validation error occurred!",
  "statusCode": 400,
  "errorType": "VALIDATION_ERROR",
  "errorSources": [{ "path": "email", "message": "Invalid email format" }],
  "stack": null
}
```

#### Shape B — `ResponseHandler.error()` (manual error returns)

Used by e.g. `ResponseHandler.unauthorized()` called directly in controllers.

```ts
{
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  error: {
    type: string;
    details?: string;
    errorSources?: Array<{ path: string | number; message: string }>;
    stack?: string;    // only in development
  };
}
```

Frontend must handle **both** shapes. A safe check:

```ts
// errorType at root → Shape A; error.type nested → Shape B
const errorType = res.errorType ?? res.error?.type ?? "UNKNOWN";
```

### Error type strings

| `errorType` / `error.type` | HTTP status | Trigger                                |
| -------------------------- | ----------- | -------------------------------------- |
| `VALIDATION_ERROR`         | 400         | Zod validation, duplicate fields       |
| `AUTHENTICATION_ERROR`     | 400/401     | Invalid credentials, bad token         |
| `ACCOUNT_LOCKED`           | 423         | Too many failed logins (threshold: 40) |
| `NOT_FOUND`                | 404         | Resource not found                     |
| `FORBIDDEN`                | 403         | Insufficient permissions               |
| `CONFLICT`                 | 409         | Resource conflict                      |
| `DUPLICATE_PAYMENT`        | 400         | Duplicate payment attempt              |
| `INVALID_TOKEN`            | 400         | Bad password reset token               |
| `TOKEN_EXPIRED`            | 400         | Expired password reset token           |
| `ALREADY_VERIFIED`         | 400         | Email already verified                 |
| `OPERATION_NOT_ALLOWED`    | 400         | e.g. password change for OAuth users   |
| `GENERAL_ERROR`            | 500         | Unhandled errors                       |
| `DATABASE_ERROR`           | 400         | Unhandled Prisma error                 |
| `UNAUTHORIZED`             | 401         | Missing/invalid access token           |
| `BAD_REQUEST`              | 400         | Generic bad request                    |
| `INTERNAL_SERVER_ERROR`    | 500         | Manual 500 response                    |
| `RATE_LIMIT_EXCEEDED`      | 429         | Rate limit (not yet enforced)          |

---

## Query Parameters — Base Pagination

Standard params accepted by `parseQuery()` in `src/utils/query.ts`. Applies to all list endpoints.

| Param        | Type                     | Default | Description                                                          |
| ------------ | ------------------------ | ------- | -------------------------------------------------------------------- |
| `page`       | `string` (parsed to int) | `1`     | Page number, min 1                                                   |
| `limit`      | `string` (parsed to int) | `10`    | Page size, capped at `maxLimit`                                      |
| `sortBy`     | `string`                 | —       | Field to sort by; must be in `sortableFields` for the endpoint       |
| `sortOrder`  | `"asc" \| "desc"`        | `"asc"` | Sort direction                                                       |
| `searchTerm` | `string`                 | —       | Full-text search across `searchFields` (case-insensitive `contains`) |

For module-specific filter params (e.g. `status`, `category`, `priority` for tasks), see the relevant module file.

---

## Known Mismatches & Gotchas (Cross-Module)

### Decimal fields come back as strings

All Prisma `Decimal` fields (`baseCompensation`, `agreedCompensation`, `amount`, `commissionAmount`, `commissionRate`, `balance`, `balanceBefore`, `balanceAfter`) are serialized as **strings** in JSON (e.g. `"150.00"`), not numbers. Parse with `parseFloat()` or a decimal library.

### Two error shapes exist

As described above, `globalErrorHandler` (triggered by `throw new AppError(...)` or Zod errors) returns `errorType` and `errorSources` at the **root level**. `ResponseHandler.error()` (called directly in controllers for 401/403) nests them under `error.type` and `error.errorSources`. Frontend must handle both.

### CORS is hardcoded to `http://localhost:3000`

`src/app.ts` hardcodes the CORS origin. The `FRONTEND_URL` env var is used in email links but **not** for CORS. Update `app.ts` to read from env before deploying.
