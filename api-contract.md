# API Contract — Get It Done Backend

Single source of truth for the frontend ↔ backend boundary.
Generated from source: `src/`, `prisma/schema.prisma`. Verified against actual code.

---

## 1. Base URL

```
/api/v1
```

Configured in `src/app.ts`:

```ts
app.use("/api/v1", router);
```

Server port is read from `PORT` env var (default `5000`). In development: `http://localhost:5000/api/v1`.

---

## 2. Authentication

### 2.1 Token issuance

**Login** — `POST /api/v1/auth/login`

Request body:

```ts
{
  email: string;
  password: string;
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    image: string | null;
  }
  accessToken: string; // also returned in body for convenience
  refreshToken: string; // ALSO set as cookie (see below)
}
```

### 2.2 Cookie delivery

The refresh token is set as a `Set-Cookie` header on: **login**, **refresh-token**, **complete-profile**, and **verify-email**.

| Attribute  | Value                                |
| ---------- | ------------------------------------ |
| Name       | `refreshToken`                       |
| `httpOnly` | `true`                               |
| `secure`   | `true` in production, `false` in dev |
| `sameSite` | `"strict"`                           |
| `maxAge`   | 7 days (604800000 ms)                |

> **Note:** The refresh token is returned in the response body **and** as a cookie. The cookie is the canonical mechanism; the body copy is for clients that cannot access cookies.

### 2.3 Sending the access token

All protected endpoints require:

```
Authorization: Bearer <accessToken>
```

The `auth` middleware extracts the token from `Authorization` header only. It does NOT check cookies for the access token.

### 2.4 Token refresh

**`POST /api/v1/auth/refresh-token`** — no `auth` middleware required.

Reads refresh token from: `req.body.refreshToken` **OR** `req.cookies.refreshToken` (body takes precedence).

Response `data`:

```ts
{
  accessToken: string; // new access token
  refreshToken: string; // new refresh token (also set as cookie)
}
```

A new refresh token is always issued and the cookie is rotated.

### 2.5 JWT payload shape

```ts
interface IJwtPayload {
  userId: string; // cuid, e.g. "clxyz..."
  email: string;
  name: string;
  role: UserRole; // "USER" | "ADMIN" | "MODERATOR"
  profileStatus: string; // "INCOMPLETE" | "COMPLETE" | "SUSPENDED"
  emailVerified: boolean;
  iat?: number; // issued-at (standard JWT claim)
  exp?: number; // expiry (standard JWT claim)
}
```

Algorithm: `HS256`. Secrets from `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.

### 2.6 What a 401 means

The `auth` middleware throws 401 when:

- `Authorization` header is missing or not `Bearer <token>`
- Token is invalid or expired
- User account is suspended (`profileStatus === "SUSPENDED"`)

On 401, discard the access token and use `POST /auth/refresh-token`. If refresh also fails (401), redirect to login.

---

## 3. Standard Response Envelopes

### 3.1 Success response

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

### 3.2 Paginated response

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

### 3.3 Error response — two shapes

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

### 3.4 Error type strings

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

## 4. Shared Enums

### `UserRole`

```ts
type UserRole = "USER" | "ADMIN" | "MODERATOR";
```

Used in: JWT payload, user profile, route authorization.

### `UserProfileStatus`

```ts
type UserProfileStatus = "INCOMPLETE" | "COMPLETE" | "SUSPENDED";
```

Used in: user object, JWT payload. After registration `profileStatus = "INCOMPLETE"`. After `PATCH /user/complete-profile` it becomes `"COMPLETE"`.

### `Gender`

```ts
type Gender = "MALE" | "FEMALE" | "OTHER";
```

Used in: `PATCH /user/complete-profile`, `PATCH /user/update-profile`.

### `Provider`

```ts
type Provider = "GOOGLE" | "CREDENTIALS";
```

Used in: user object. Affects which auth operations are allowed (e.g. password change only for `"CREDENTIALS"`).

### `TaskStatus`

```ts
type TaskStatus =
  | "DRAFT"
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "PAYMENT_PROCESSING"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "DISPUTED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";
```

Status machine (see §8 for transitions). Used in: task object, `GET /task/all-task` filter param.

### `TaskPriority`

```ts
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
```

Default: `"MEDIUM"`. Used in: task creation, `GET /task/all-task` filter param.

### `TaskCategory`

```ts
type TaskCategory =
  | "DELIVERY"
  | "CLEANING"
  | "REPAIR"
  | "TUTORING"
  | "GARDENING"
  | "MOVING"
  | "PET_CARE"
  | "TECH_SUPPORT"
  | "OTHER";
```

Used in: task creation, `GET /task/all-task` filter param.

### `ApplicationStatus`

```ts
type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
```

Used in: application object.

### `PaymentMethod`

```ts
type PaymentMethod = "ONLINE" | "CASH";
```

### `PaymentStatus`

```ts
type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";
```

### `CashStatus`

```ts
type CashStatus =
  | "PAYER_CLAIMED"
  | "PAYEE_CONFIRMED"
  | "PAYEE_DISPUTED"
  | "ADMIN_VERIFIED";
```

Only set for `method === "CASH"` payments.

### `PaymentType`

```ts
type PaymentType = "INITIAL" | "REFUND" | "RETRY" | "TIP" | "ADJUSTMENT";
```

Default: `"INITIAL"`.

### `WalletTransactionType`

```ts
type WalletTransactionType = "CREDIT" | "DEBIT";
```

### `WalletTransactionCategory`

```ts
type WalletTransactionCategory =
  | "TASK_PAYMENT"
  | "DIRECT_COMMISSION_DEDUCTION"
  | "DUE_COMMISSION_DEDUCTION"
  | "BONUS"
  | "REFUND"
  | "WITHDRAWAL";
```

### `WalletTransactionStatus`

```ts
type WalletTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
```

Default: `"COMPLETED"`.

### `CommissionStatus`

```ts
type CommissionStatus = "DUE" | "PAID" | "CANCELLED";
```

---

## 5. Query Parameters (List Endpoints)

Standard params accepted by `parseQuery()` in `src/utils/query.ts`.

| Param        | Type                     | Default | Description                                                          |
| ------------ | ------------------------ | ------- | -------------------------------------------------------------------- |
| `page`       | `string` (parsed to int) | `1`     | Page number, min 1                                                   |
| `limit`      | `string` (parsed to int) | `10`    | Page size, capped at `maxLimit`                                      |
| `sortBy`     | `string`                 | —       | Field to sort by; must be in `sortableFields` for the endpoint       |
| `sortOrder`  | `"asc" \| "desc"`        | `"asc"` | Sort direction                                                       |
| `searchTerm` | `string`                 | —       | Full-text search across `searchFields` (case-insensitive `contains`) |

#### `GET /api/v1/task/all-task` additional filter params

| Param      | Type           | Allowed values                |
| ---------- | -------------- | ----------------------------- |
| `status`   | `TaskStatus`   | Any `TaskStatus` enum value   |
| `category` | `TaskCategory` | Any `TaskCategory` enum value |
| `priority` | `TaskPriority` | Any `TaskPriority` enum value |

Sortable fields for tasks: `createdAt`, `updatedAt`, `title`.
Search fields: `title`, `description`, `location`.
`maxLimit` = 50, `defaultLimit` = 10.

---

## 6. Endpoints

### 6.1 Auth — `/api/v1/auth`

| Method | Path                       | Auth | Description                        |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/login`                   | —    | Login with email/password          |
| POST   | `/logout`                  | —    | Clear refresh token cookie         |
| POST   | `/refresh-token`           | —    | Issue new access + refresh token   |
| GET    | `/current-user`            | JWT  | Get authenticated user             |
| GET    | `/loggedin-user`           | JWT  | Alias for `/current-user`          |
| POST   | `/update-password`         | JWT  | Change password (CREDENTIALS only) |
| POST   | `/forgot-password`         | —    | Send password reset email          |
| POST   | `/reset-password`          | —    | Reset password with token          |
| GET    | `/email-verification`      | JWT  | Get email verification status      |
| POST   | `/send-verification-email` | JWT  | Send email verification link       |
| POST   | `/verify-email`            | —    | Verify email with token            |

---

#### `POST /login`

Request:

```ts
{
  email: string;
  password: string;
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    image: string | null;
  }
  accessToken: string;
  refreshToken: string; // also set as httpOnly cookie
}
```

Errors: `AUTHENTICATION_ERROR` (400) for wrong credentials, `ACCOUNT_LOCKED` (423).

---

#### `POST /logout`

No body required. Clears `refreshToken` cookie. Response `data`: `null`.

---

#### `POST /refresh-token`

Request body (optional — also reads from cookie):

```ts
{ refreshToken?: string }
```

Response `data`:

```ts
{
  accessToken: string;
  refreshToken: string;
}
```

---

#### `GET /current-user` / `GET /loggedin-user`

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: UserProfileStatus;
  provider: Provider;
  image: string | null;
  emailVerified: boolean;
}
```

---

#### `POST /update-password`

> ⚠️ No `validateRequest` middleware — validation is in the service layer only.

Request:

```ts
{
  oldPassword: string;
  newPassword: string;
} // newPassword min 8 chars
```

Response `data`: `null`.

---

#### `POST /forgot-password`

> ⚠️ No `validateRequest` middleware.

Request:

```ts
{
  email: string;
}
```

Response `data`: `null`. Always returns 200 even if email not found (security).
Side effect: sends email with `resetToken` link to `FRONTEND_URL/reset-password?token=<token>&email=<email>`. Token expires in 15 minutes.

---

#### `POST /reset-password`

> ⚠️ No `validateRequest` middleware.

Request:

```ts
{
  email: string;
  newPassword: string;
  resetToken: string;
}
```

`resetToken` is the raw token from the URL (not hashed). Response `data`: `null`.

---

#### `GET /email-verification`

Response `data`:

```ts
{
  emailVerified: boolean;
  emailVerificationSentAt: string | null; // ISO datetime
  emailVerificationExpiresAt: string | null; // ISO datetime
  emailVerifiedAt: string | null; // ISO datetime
}
```

---

#### `POST /send-verification-email`

No request body. Uses `req.user.email` from JWT. Rate-limited to 1 request per minute.
Response `data`: `null`.

---

#### `POST /verify-email`

Request:

```ts
{
  token: string;
} // raw token from email URL
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    emailVerified: boolean;
  }
  accessToken: string;
  refreshToken: string; // also set as httpOnly cookie
}
```

---

### 6.2 User — `/api/v1/user`

| Method | Path                    | Auth | Roles | Description                                    |
| ------ | ----------------------- | ---- | ----- | ---------------------------------------------- |
| GET    | `/`                     | —    | —     | Get all users (temporary — remove before prod) |
| POST   | `/register/credentials` | —    | —     | Register new user                              |
| GET    | `/my-profile`           | JWT  | USER  | Get own full profile                           |
| PATCH  | `/complete-profile`     | JWT  | USER  | Complete profile (one-time)                    |
| PATCH  | `/update-profile`       | JWT  | USER  | Update profile fields                          |
| PATCH  | `/update-avatar`        | JWT  | USER  | Update avatar URL                              |
| DELETE | `/delete-account`       | JWT  | USER  | Soft-delete own account                        |
| GET    | `/:id`                  | —    | —     | Get public profile by ID                       |

---

#### `POST /register/credentials`

Request:

```ts
{
  email: string; // max 255 chars, valid email
  name: string; // min 1, max 100 chars
  password: string; // min 8, max 255 chars
}
```

Response `data` (status 201):

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole; // always "USER" on registration
  createdAt: string;
  updatedAt: string;
}
```

Side effect: creates a `Wallet` record for the user in the same transaction.

---

#### `GET /my-profile`

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: UserProfileStatus;
  provider: Provider;
  image: string | null;
  emailVerified: boolean;
}
```

---

#### `PATCH /complete-profile`

Can only be called when `profileStatus === "INCOMPLETE"`. Sets `profileStatus` to `"COMPLETE"`.

Request:

```ts
{
  dateOfBirth: string;  // ISO date, coerced to Date
  gender: Gender;       // "MALE" | "FEMALE" | "OTHER"
  address: string;      // min 1, max 255 chars
  phone: string;        // regex: /^01\d{9}$/ (11-digit Bangladesh mobile)
  bio?: string;         // max 500 chars
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    dateOfBirth: string;
    address: string;
    phone: string;
    gender: Gender;
    bio: string | null;
    emailVerified: boolean;
    profileStatus: UserProfileStatus;
    createdAt: string;
    updatedAt: string;
  }
  accessToken: string; // new token with updated profileStatus
  refreshToken: string; // also set as cookie
}
```

---

#### `PATCH /update-profile`

Requires `profileStatus === "COMPLETE"` (403 otherwise).

Request (all optional):

```ts
{
  name?: string;         // min 1, max 100 chars
  dateOfBirth?: string;  // ISO date
  gender?: Gender;
  address?: string;      // min 1, max 255 chars
  phone?: string;        // regex: /^01\d{9}$/
  bio?: string;          // max 500 chars
}
```

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  dateOfBirth: string | null;
  address: string | null;
  phone: string | null;
  gender: Gender | null;
  bio: string | null;
  profileStatus: UserProfileStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

#### `PATCH /update-avatar`

Requires `profileStatus === "COMPLETE"`.

Request:

```ts
{
  image: string;
} // valid URL, max 255 chars
```

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  image: string;
  updatedAt: string;
}
```

---

#### `DELETE /delete-account`

Soft-delete: sets `isDeleted = true`, `deletedAt`, `deletedBy = userId`. Response `data`: `null`.

---

#### `GET /:id`

Public profile. Response `data`:

```ts
{
  id: string;
  image: string | null;
  name: string;
  bio: string | null;
}
```

---

### 6.3 Task — `/api/v1/task`

| Method | Path                          | Auth | Roles | Description                             |
| ------ | ----------------------------- | ---- | ----- | --------------------------------------- |
| GET    | `/all-task`                   | —    | —     | List tasks with filters/pagination      |
| GET    | `/:id`                        | —    | —     | Get task by ID                          |
| POST   | `/post-task`                  | JWT  | USER  | Create task                             |
| PATCH  | `/update-task/:id`            | JWT  | USER  | Update task (owner only)                |
| DELETE | `/delete-task/:id`            | JWT  | USER  | Soft-delete task (owner only)           |
| POST   | `/:taskId/image`              | JWT  | USER  | Add images to task (max 5, owner only)  |
| PATCH  | `/:taskId/image`              | JWT  | USER  | Update task images (owner only)         |
| DELETE | `/:taskId/image/:imageId`     | JWT  | USER  | Delete a single task image (owner only) |
| PATCH  | `/:taskId/mark-in-progress`   | JWT  | USER  | Tasker starts work                      |
| PATCH  | `/:taskId/mark-completed`     | JWT  | USER  | Tasker marks done                       |
| PATCH  | `/:taskId/approve-completion` | JWT  | USER  | Poster approves completion              |
| PATCH  | `/:taskId/request-revision`   | JWT  | USER  | Poster requests revision                |

---

#### `POST /post-task`

Request:

```ts
{
  title: string;              // min 1, max 200 chars
  description: string;        // min 1
  category: TaskCategory;
  priority?: TaskPriority;    // default "MEDIUM"
  location: string;           // min 1, max 255 chars
  latitude?: number;
  longitude?: number;
  baseCompensation: number;   // positive
  scheduledAt: string;        // ISO 8601 datetime
  estimatedDuration: number;  // positive integer, in minutes
  expiresAt?: string;         // ISO 8601 datetime
}
```

Response `data` (status 201): Task object (owner view — see §7).

---

#### `GET /all-task`

Query params: standard pagination + `status`, `category`, `priority`, `searchTerm`, `sortBy`, `sortOrder` (see §5).

Response: paginated. `data` is `TaskPublic[]`. Each task includes `images: Image[]`.

---

#### `GET /:id`

Response `data`: Task object (public view) including:

- `images: Image[]`
- `postedBy: { id: string; name: string; image: string | null }`

---

#### `PATCH /update-task/:id`

Owner only. All fields optional. Same shape as create request but all optional.

Response `data`:

```ts
{
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
}
```

---

#### `POST /:taskId/image`

Add images to a task. Owner only. Rejects if task already has images.

Request:

```ts
{
  images: Array<{
    url: string; // valid URL, max 500 chars
    altText?: string; // optional, max 255 chars
  }>; // min 1, max 5 images
}
```

Response `data` (status 201): Array of created Image objects:

```ts
Array<{
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
  taskId: string;
}>;
```

**Validation errors:**

- `400` — Task already has images
- `403` — Unauthorized (not task owner)
- `404` — Task not found

---

#### `PATCH /:taskId/image`

Update the images of a task. Owner only. Specify which existing images to keep, and provide any new images to add. Total of kept + new images must not exceed 5.

Request:

```ts
{
  keepImageIds: string[];        // IDs of existing images to retain (can be empty [])
  newImages?: Array<{            // new images to add (defaults to [])
    url: string;                 // valid URL, max 500 chars
    altText?: string;            // optional, max 255 chars
  }>;
}
```

Response `data` (status 200): Final array of Image objects after update (ordered by `createdAt asc`):

```ts
Array<{
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
  taskId: string;
}>;
```

**Error responses:**

- `400` — `keepImageIds.length + newImages.length > 5` | Any `keepImageIds` entry does not belong to this task
- `403` — Unauthorized (not task owner)
- `404` — Task not found

**Notes:**

- Pass `keepImageIds: []` and `newImages: [...]` to replace all images.
- Pass `keepImageIds: [id1, id2]` and `newImages: []` to delete all except the kept ones.
- The delete and create operations run in a single database transaction.

---

#### `DELETE /:taskId/image/:imageId`

Deletes a single image from a task. Only the task owner can delete images.

**Auth:** Bearer token required  
**Roles:** USER

**Params:**

- `taskId` — ID of the task
- `imageId` — ID of the image to delete

**Success Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Image deleted successfully!",
  "data": null
}
```

**Error Responses:**

- `400` — Task ID or Image ID is missing
- `403` — Unauthorized (not task owner)
- `404` — Image not found or does not belong to this task

---

#### Status transition endpoints

All return `data: null` on success.

| Endpoint                      | Who                | Precondition     | Result status        |
| ----------------------------- | ------------------ | ---------------- | -------------------- |
| `/:taskId/mark-in-progress`   | Approved applicant | `ASSIGNED`       | `IN_PROGRESS`        |
| `/:taskId/mark-completed`     | Approved applicant | `IN_PROGRESS`    | `PENDING_REVIEW`     |
| `/:taskId/approve-completion` | Task poster        | `PENDING_REVIEW` | `PAYMENT_PROCESSING` |
| `/:taskId/request-revision`   | Task poster        | `PENDING_REVIEW` | `IN_PROGRESS`        |

---

### 6.4 Application — `/api/v1/application`

| Method | Path                       | Auth | Roles | Description                                 |
| ------ | -------------------------- | ---- | ----- | ------------------------------------------- |
| POST   | `/:taskId`                 | JWT  | USER  | Apply for a task                            |
| GET    | `/my-applications`         | JWT  | USER  | Own applications                            |
| GET    | `/task/:taskId`            | JWT  | USER  | All applications for a task (owner only)    |
| GET    | `/:applicationId`          | JWT  | USER  | Application by ID (applicant or task owner) |
| PATCH  | `/approve/:applicationId`  | JWT  | USER  | Approve application (task owner)            |
| PATCH  | `/reject/:applicationId`   | JWT  | USER  | Reject application (task owner)             |
| PATCH  | `/withdraw/:applicationId` | JWT  | USER  | Withdraw application (applicant)            |

> ⚠️ Route ordering: `GET /my-applications` and `GET /task/:taskId` are registered **before** `GET /:applicationId`. Pass a string like `my-applications` as `:applicationId` and it will match the wrong route.

---

#### `POST /:taskId`

Request:

```ts
{
  message: string; // min 10, max 5000 chars
  proposedCompensation: number; // positive
}
```

Response `data`:

```ts
{
  id: string;
  message: string;
  proposedCompensation: string; // Decimal serialized as string
  status: ApplicationStatus; // always "PENDING" on creation
  createdAt: string;
  updatedAt: string;
}
```

Constraints: task must be `OPEN`; cannot apply to own task; cannot apply twice.

---

#### `GET /my-applications`

Response `data`:

```ts
Array<{
  id: string;
  message: string;
  proposedCompensation: string; // Decimal as string
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  task: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    postedById: string;
  };
}>;
```

---

#### `GET /task/:taskId`

Task owner only.

Response `data`:

```ts
Array<{
  id: string;
  message: string;
  proposedCompensation: string;
  status: ApplicationStatus;
  withdrawalReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: { id: string; name: string };
}>;
```

---

#### `GET /:applicationId`

Accessible by applicant or task owner.

Response `data`:

```ts
{
  id: string;
  message: string;
  proposedCompensation: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  withdrawalReason: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    name: string;
  }
  task: TaskOwner; // full task object minus isDeleted/deletedAt/deletedBy/approvedApplicationId
}
```

---

#### `PATCH /approve/:applicationId`

No request body. Task owner only; task must be `OPEN`; application must be `PENDING`.

Side effects (in a transaction):

1. Application status → `APPROVED`
2. All other `PENDING` applications for this task → `REJECTED`
3. Task `status` → `ASSIGNED`, `approvedApplicationId` set, `agreedCompensation` = applicant's `proposedCompensation`

Response `data`: Updated application record (full Prisma fields).

---

#### `PATCH /reject/:applicationId`

Request:

```ts
{
  rejectionReason: string;
} // min 10, max 500 chars
```

Task owner only; application must be `PENDING`. Response `data`: Updated application record.

---

#### `PATCH /withdraw/:applicationId`

Request:

```ts
{
  withdrawalReason: string;
} // min 10, max 500 chars
```

Applicant only; application must be `PENDING`. Response `data`: `{ message: "Application withdrawn successfully" }`.

---

### 6.5 Payment — `/api/v1/payment`

| Method | Path                       | Auth | Roles | Description                            |
| ------ | -------------------------- | ---- | ----- | -------------------------------------- |
| POST   | `/cash/init/:taskId`       | JWT  | USER  | Initiate cash payment (poster)         |
| PATCH  | `/cash/confirm/:paymentId` | JWT  | USER  | Confirm cash received (tasker)         |
| PATCH  | `/cash/decline/:paymentId` | JWT  | USER  | Dispute cash payment (tasker)          |
| POST   | `/online/init/:taskId`     | JWT  | USER  | Initiate online payment via SSLCommerz |
| POST   | `/online/ipn-validate/`    | —    | —     | SSLCommerz IPN webhook                 |
| GET    | `/user/payment-made`       | JWT  | USER  | Payments made by current user          |
| GET    | `/user/payment-received`   | JWT  | USER  | Payments received by current user      |
| GET    | `/:id`                     | JWT  | USER  | Payment by ID                          |

> ⚠️ **IPN webhook is currently using `dummyValidateOnlinePaymentService`** — the real `validateOnlinePaymentService` is commented out in `payment.controller.ts`. Online payment settlement does not actually process in production code.

---

#### `POST /cash/init/:taskId`

No request body. Task must be in `PAYMENT_PROCESSING` status. Poster only.

Response `data` (status 201):

```ts
{
  id: string;
  transactionId: string; // "TNX-..." format
  amount: string; // Decimal as string
  method: "CASH";
  status: PaymentStatus; // "PENDING"
  cashStatus: "PAYER_CLAIMED";
}
```

---

#### `PATCH /cash/confirm/:paymentId`

No request body. Tasker (payee) only. `cashStatus` must be `"PAYER_CLAIMED"`.

Side effects (in a transaction):

1. Payment `status` → `COMPLETED`, `cashStatus` → `PAYEE_CONFIRMED`
2. Task `status` → `COMPLETED`
3. If tasker wallet balance ≥ commission: deduct commission directly, create `DIRECT_COMMISSION_DEDUCTION` wallet transaction
4. Otherwise: create `CommissionDue` record

Response `data`:

```ts
{
  id: string;
  transactionId: string;
  paidAt: string;
  payeeConfirmedAt: string;
  payerId: string;
  payeeId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  cashStatus: CashStatus;
}
```

---

#### `PATCH /cash/decline/:paymentId`

No request body. Tasker (payee) only. Sets `cashStatus` → `PAYEE_DISPUTED`, task → `DISPUTED`.

Response `data`: Updated payment record.

---

#### `POST /online/init/:taskId`

No request body. Task must be in `PAYMENT_PROCESSING`. Poster only.

Response `data` (status 201):

```ts
{
  payment: {
    id: string;
    transactionId: string;
    sessionToken: string;
    amount: string;
    method: "ONLINE";
    status: PaymentStatus;
    sessionExpiresAt: string; // 30 min from creation
    gatewayResponse: object | null;
  }
  gatewayUrl: string; // SSLCommerz redirect URL — frontend must redirect here
  message: string;
  isExisting: boolean; // true if returning a previously initiated unexpired session
}
```

Payment session expires in 30 minutes. If a non-expired pending session exists, it is returned as-is (`isExisting: true`).

---

#### `GET /user/payment-made`

Response `data`:

```ts
Array<{
  id: string;
  transactionId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  cashStatus: CashStatus | null;
  paidAt: string | null;
  createdAt: string;
  taskId: string;
  payee: { id: string; name: string; email: string };
}>;
```

Throws 404 if no payments found.

---

#### `GET /user/payment-received`

Filters `status === "COMPLETED"` only.

Response `data`:

```ts
Array<{
  id: string;
  transactionId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  cashStatus: CashStatus | null;
  paidAt: string | null;
  commissionAmount: string;
  commissionDeducted: boolean;
  createdAt: string;
  taskId: string;
  payer: { id: string; name: string; email: string };
}>;
```

Throws 404 if no payments found.

---

#### `GET /:id`

Accessible by payer or payee.

Response `data`:

```ts
{
  id: string;
  transactionId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  cashStatus: CashStatus | null;
  paidAt: string | null;
  createdAt: string;
  failedAt: string | null;
  failureReason: string | null;
  commissionAmount: string;
  commissionDeducted: boolean;
  task: {
    title: string;
    category: TaskCategory;
    location: string;
    status: TaskStatus;
  }
  payer: {
    id: string;
    name: string;
    email: string;
  }
  payee: {
    id: string;
    name: string;
    email: string;
  }
}
```

---

### 6.6 Wallet — `/api/v1/wallet`

| Method | Path                         | Auth | Roles | Description                      |
| ------ | ---------------------------- | ---- | ----- | -------------------------------- |
| GET    | `/my-wallet`                 | JWT  | USER  | Get wallet balance               |
| GET    | `/wallet-transactions`       | JWT  | USER  | All wallet transactions          |
| GET    | `/wallet-transaction/:tnxId` | JWT  | USER  | Transaction by ID                |
| GET    | `/commission-due`            | JWT  | USER  | All pending commission dues      |
| GET    | `/commission-due/:dueId`     | JWT  | USER  | Commission due by ID             |
| PATCH  | `/commission-due/pay/:dueId` | JWT  | USER  | Pay a commission due from wallet |

---

#### `GET /my-wallet`

Response `data`:

```ts
{
  id: string;
  userId: string;
  balance: string; // Decimal as string
  updatedAt: string;
  createdAt: string;
}
```

---

#### `GET /wallet-transactions`

Response `data`: Full `WalletTransaction[]` array (all fields).

---

#### `GET /wallet-transaction/:tnxId`

`:tnxId` is the wallet transaction **record ID** (not the `transactionId` string).

Response `data`: Full `WalletTransaction` record including nested `wallet` object.

---

#### `GET /commission-due`

Returns only `status === "DUE"` records. Omits `paidAt`, `paidViaPayment`, `paidViaTxn`.

Response `data`:

```ts
Array<{
  id: string;
  walletId: string;
  taskId: string;
  amount: string;
  status: "DUE";
  createdAt: string;
  updatedAt: string;
}>;
```

---

#### `GET /commission-due/:dueId`

Response `data`:

```ts
{
  id: string;
  walletId: string;
  taskId: string;
  amount: string;
  status: CommissionStatus;
  paidAt: string | null;
  paidViaPayment: string | null;
  paidViaTxn: string | null;
  createdAt: string;
  updatedAt: string;
  wallet: { id: string; userId: string; balance: string; ... };
  task: {
    id: string; title: string; description: string; category: TaskCategory;
    status: TaskStatus; createdAt: string; updatedAt: string;
    baseCompensation: string; agreedCompensation: string | null;
    postedBy: { id: string; name: string; email: string };
  };
}
```

---

#### `PATCH /commission-due/pay/:dueId`

No request body. Deducts `amount` from wallet balance. Requires wallet balance ≥ commission amount.

Side effects: creates `DUE_COMMISSION_DEDUCTION` wallet transaction, updates `CommissionDue.status` → `"PAID"`.

Response `data`: Updated `CommissionDue` record.

---

## 7. Shared Entity Types

### `TaskPublic` (returned by `GET /task/all-task`, `GET /task/:id`)

```ts
interface TaskPublic {
  id: string;
  title: string; // max 200 chars
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  postedById: string;
  status: TaskStatus;
  location: string;
  latitude: number | null;
  longitude: number | null;
  baseCompensation: string; // Decimal serialized as string
  // agreedCompensation is OMITTED from public view
  scheduledAt: string; // ISO datetime
  estimatedDuration: number | null; // minutes
  expiresAt: string | null;
  approvedApplicationId: string | null; // OMITTED from public view — not present
  createdAt: string;
  updatedAt: string;
  images: Image[];
  // GET /:id only:
  postedBy?: { id: string; name: string; image: string | null };
}
```

> Fields omitted from public view via Prisma `omit`: `isDeleted`, `deletedAt`, `deletedBy`, `approvedApplicationId`, `agreedCompensation`.

### `TaskOwner` (returned to task owner in some contexts)

Same as `TaskPublic` but additionally includes `agreedCompensation: string | null`. Still omits `isDeleted`, `deletedAt`, `deletedBy`.

### `Image`

```ts
interface Image {
  id: string;
  url: string;
  altText: string | null;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}
```

### `UserPublic`

```ts
interface UserPublic {
  id: string;
  image: string | null;
  name: string;
  bio: string | null;
}
```

### `UserProfile` (own profile)

```ts
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: UserProfileStatus;
  provider: Provider;
  image: string | null;
  emailVerified: boolean;
}
```

### `Payment`

```ts
interface Payment {
  id: string;
  transactionId: string; // "TNX-..." format
  taskId: string;
  payerId: string;
  payeeId: string;
  amount: string; // Decimal as string
  method: PaymentMethod;
  type: PaymentType; // default "INITIAL"
  status: PaymentStatus;
  cashStatus: CashStatus | null; // only for CASH payments
  commissionRate: string; // Decimal as string, e.g. "0.15"
  commissionAmount: string; // Decimal as string
  commissionDeducted: boolean;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `Wallet`

```ts
interface Wallet {
  id: string;
  userId: string;
  balance: string; // Decimal as string
  updatedAt: string;
  createdAt: string;
}
```

### `WalletTransaction`

```ts
interface WalletTransaction {
  id: string;
  transactionId: string; // "WTNX-..." format
  walletId: string;
  amount: string; // Decimal as string
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  status: WalletTransactionStatus; // default "COMPLETED"
  refPaymentId: string | null;
  refCommissionDueId: string | null;
  description: string | null;
  metadata: object | null;
  balanceBefore: string | null; // Decimal as string
  balanceAfter: string | null; // Decimal as string
  createdAt: string;
}
```

### `CommissionDue`

```ts
interface CommissionDue {
  id: string;
  walletId: string;
  taskId: string;
  amount: string; // Decimal as string
  status: CommissionStatus;
  paidAt: string | null;
  paidViaPayment: string | null;
  paidViaTxn: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 8. Task Status Machine

```
DRAFT
  ↓ (not implemented — tasks created as OPEN)
OPEN
  ↓ approve application
ASSIGNED
  ↓ tasker calls mark-in-progress
IN_PROGRESS
  ↓ tasker calls mark-completed
PENDING_REVIEW ──→ (poster calls request-revision) ──→ IN_PROGRESS
  ↓ poster calls approve-completion
PAYMENT_PROCESSING
  ↓ payment confirmed / IPN validated
COMPLETED

  Side exits:
  PAYMENT_PROCESSING → DISPUTED (tasker declines cash payment)
  IN_PROGRESS / PAYMENT_PROCESSING → PAYMENT_FAILED (not yet wired)
```

---

## 9. Route Protection Map

```ts
// All routes require: Authorization: Bearer <accessToken>
// Role checked via authorize([...]) middleware

const protectedRoutes = {
  // Auth
  "GET  /api/v1/auth/current-user": { roles: ["USER", "ADMIN", "MODERATOR"] },
  "GET  /api/v1/auth/loggedin-user": { roles: ["USER", "ADMIN", "MODERATOR"] },
  "POST /api/v1/auth/update-password": {
    roles: ["USER", "ADMIN", "MODERATOR"],
  },
  "GET  /api/v1/auth/email-verification": {
    roles: ["USER", "ADMIN", "MODERATOR"],
  },
  "POST /api/v1/auth/send-verification-email": {
    roles: ["USER", "ADMIN", "MODERATOR"],
  },

  // User
  "GET  /api/v1/user/my-profile": { roles: ["USER"] },
  "PATCH /api/v1/user/complete-profile": { roles: ["USER"] },
  "PATCH /api/v1/user/update-profile": { roles: ["USER"] },
  "PATCH /api/v1/user/update-avatar": { roles: ["USER"] },
  "DELETE /api/v1/user/delete-account": { roles: ["USER"] },

  // Task
  "POST /api/v1/task/post-task": { roles: ["USER"] },
  "PATCH /api/v1/task/update-task/:id": { roles: ["USER"] },
  "DELETE /api/v1/task/delete-task/:id": { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/mark-in-progress": { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/mark-completed": { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/approve-completion": { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/request-revision": { roles: ["USER"] },

  // Application
  "POST /api/v1/application/:taskId": { roles: ["USER"] },
  "GET  /api/v1/application/my-applications": { roles: ["USER"] },
  "GET  /api/v1/application/task/:taskId": { roles: ["USER"] },
  "GET  /api/v1/application/:applicationId": { roles: ["USER"] },
  "PATCH /api/v1/application/approve/:applicationId": { roles: ["USER"] },
  "PATCH /api/v1/application/reject/:applicationId": { roles: ["USER"] },
  "PATCH /api/v1/application/withdraw/:applicationId": { roles: ["USER"] },

  // Payment
  "POST /api/v1/payment/cash/init/:taskId": { roles: ["USER"] },
  "PATCH /api/v1/payment/cash/confirm/:paymentId": { roles: ["USER"] },
  "PATCH /api/v1/payment/cash/decline/:paymentId": { roles: ["USER"] },
  "POST /api/v1/payment/online/init/:taskId": { roles: ["USER"] },
  "GET  /api/v1/payment/user/payment-made": { roles: ["USER"] },
  "GET  /api/v1/payment/user/payment-received": { roles: ["USER"] },
  "GET  /api/v1/payment/:id": { roles: ["USER"] },

  // Wallet
  "GET  /api/v1/wallet/my-wallet": { roles: ["USER"] },
  "GET  /api/v1/wallet/wallet-transactions": { roles: ["USER"] },
  "GET  /api/v1/wallet/wallet-transaction/:tnxId": { roles: ["USER"] },
  "GET  /api/v1/wallet/commission-due": { roles: ["USER"] },
  "GET  /api/v1/wallet/commission-due/:dueId": { roles: ["USER"] },
  "PATCH /api/v1/wallet/commission-due/pay/:dueId": { roles: ["USER"] },
};

// Public routes (no auth required)
const publicRoutes = [
  "GET  /api/v1/task/all-task",
  "GET  /api/v1/task/:id",
  "GET  /api/v1/user/:id",
  "GET  /api/v1/user/",
  "POST /api/v1/user/register/credentials",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/refresh-token",
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/reset-password",
  "POST /api/v1/auth/verify-email",
  "POST /api/v1/payment/online/ipn-validate/",
];
```

---

## 10. Known Mismatches and Gotchas

### 10.1 Decimal fields come back as strings

All Prisma `Decimal` fields (`baseCompensation`, `agreedCompensation`, `amount`, `commissionAmount`, `commissionRate`, `balance`, `balanceBefore`, `balanceAfter`) are serialized as **strings** in JSON (e.g. `"150.00"`), not numbers. Parse with `parseFloat()` or a decimal library.

### 10.2 Two error shapes exist

As described in §3.3, `globalErrorHandler` (triggered by `throw new AppError(...)` or Zod errors) returns `errorType` and `errorSources` at the **root level**. `ResponseHandler.error()` (called directly in controllers for 401/403) nests them under `error.type` and `error.errorSources`. Frontend must handle both.

### 10.3 IPN webhook uses dummy validation service

`POST /api/v1/payment/online/ipn-validate/` calls `dummyValidateOnlinePaymentService` instead of `validateOnlinePaymentService`. The dummy service **does** execute settlement (wallet credit, commission deduction, task → `COMPLETED`) but **skips the real SSLCommerz gateway validation API call** — it trusts the incoming `status` field directly without verifying against SSLCommerz. This must be replaced with the real service before production or the platform is vulnerable to forged IPN requests.

### 10.4 `GET /api/v1/payment/user/payment-made` throws 404 when empty

If no payments exist, it throws `AppError(404, "No payments made found")` instead of returning an empty array. Same for `payment-received`.

### 10.5 `agreedCompensation` is hidden from public task views

`agreedCompensation` is omitted from `GET /task/all-task` and `GET /task/:id`. To see the agreed amount, access payment records or the task via an owner-context route.

### 10.6 `PATCH /complete-profile` returns new tokens

After completing a profile, the response includes fresh `accessToken` and `refreshToken` with `profileStatus: "COMPLETE"`. The client must replace stored tokens.

### 10.7 Auth routes missing `validateRequest` middleware

`POST /auth/update-password`, `POST /auth/forgot-password`, and `POST /auth/reset-password` do **not** use the `validateRequest` Zod middleware. Request body validation only happens implicitly in the service layer (via `bcrypt.compare`, etc.). Invalid inputs may produce unhelpful error messages.

### 10.8 `GET /api/v1/user/` returns all users — temporary

This route has no auth, no pagination, and returns every user in the database. Must be removed before production.

### 10.9 CORS is hardcoded to `http://localhost:3000`

`src/app.ts` hardcodes the CORS origin. The `FRONTEND_URL` env var is used in email links but **not** for CORS. Update `app.ts` to read from env before deploying.

### 10.10 Task creation always creates with `status = "OPEN"`

The `DRAFT` status exists in the enum but is never set in the service. All created tasks start as `OPEN`.

### 10.11 `estimatedDuration` is in minutes

The Prisma schema comment says `// in minutes TODO: change to required`. It is currently optional in the validator despite being marked with `.positive()`. Frontend should treat it as optional.

### 10.12 Refresh token in login response body

The `refreshToken` is returned in the login response body **and** set as an httpOnly cookie. The body copy is redundant for browser clients but needed for mobile/native clients that handle cookies manually.

### 10.13 `wallet-transaction/:tnxId` uses DB record ID, not transactionId

The `:tnxId` parameter on `GET /wallet-transaction/:tnxId` is the **Prisma record ID** (cuid), not the `transactionId` string (e.g. `"WTNX-..."`).

### 10.14 Account lock threshold is currently 40, not 5

`auth.service.ts` increments the failed login counter but only locks after **40** failures (there is a comment saying it should be 5; the 40 is for testing). Do not rely on locking as a security mechanism in production without fixing this.

### 10.15 Phone validation is Bangladesh-specific

The phone regex `/^01\d{9}$/` matches 11-digit Bangladeshi mobile numbers starting with `01`. Non-BD phone formats will fail validation.
