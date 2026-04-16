# AGENTS.md — Get It Done Backend

This file provides authoritative context for AI agents working in this repository. Read it fully before making any changes.

## mandatory update AGENTS.md, CLAUDE.MD and api-cntract.md files after every update in enpoints and apis.

## Project Overview

**Get It Done** is a task marketplace backend. Users post tasks (e.g., delivery, cleaning, repair), other users apply for those tasks, and the platform handles application management, payments (cash and online via SSLCommerz), wallet management, and a commission system.

- **Runtime:** Node.js (CommonJS)
- **Language:** TypeScript (strict mode)
- **Framework:** Express 5
- **ORM:** Prisma 6 with PostgreSQL
- **Validation:** Zod 4
- **Auth:** JWT (access + refresh tokens), bcryptjs for password hashing
- **Email:** Nodemailer (SMTP)
- **Payment Gateway:** SSLCommerz (`sslcommerz-lts`)
- **Dev server:** `ts-node-dev --respawn --transpile-only`

---

## Development Commands

```bash
# Start development server
npm run dev

# Prisma migrations
npx prisma migrate dev --name <migration_name>

# Prisma client regenerate
npx prisma generate

# TypeScript compile check
npx tsc --noEmit
```

---

## Environment Variables

All config is loaded in `src/config/index.ts`. Required `.env` keys:

| Variable                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `PORT`                      | Server port (default: 5000)                      |
| `NODE_ENV`                  | `development` or `production`                    |
| `DATABASE_URL`              | PostgreSQL connection URL (used by Prisma)       |
| `APP_URL`                   | Backend base URL                                 |
| `FRONTEND_URL`              | Frontend base URL (CORS origin)                  |
| `COMMISSION_RATE`           | Platform commission rate as decimal (e.g., 0.15) |
| `JWT_ACCESS_SECRET`         | Secret for access token signing                  |
| `JWT_REFRESH_SECRET`        | Secret for refresh token signing                 |
| `JWT_EXPIRES_IN`            | Access token expiry (e.g., `15d`)                |
| `JWT_REFRESH_EXPIRES_IN`    | Refresh token expiry (e.g., `30d`)               |
| `SMTP_HOST`                 | SMTP host (default: smtp.gmail.com)              |
| `SMTP_PORT`                 | SMTP port (default: 587)                         |
| `SMTP_USER`                 | SMTP username                                    |
| `SMTP_PASS`                 | SMTP password                                    |
| `SSLCOMMERZ_STORE_ID`       | SSLCommerz store ID                              |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password                        |
| `SSLCOMMERZ_SUCCESS_URL`    | Payment success redirect URL                     |
| `SSLCOMMERZ_FAIL_URL`       | Payment failure redirect URL                     |
| `SSLCOMMERZ_CANCEL_URL`     | Payment cancel redirect URL                      |
| `SSLCOMMERZ_GATEWAY_URL`    | SSLCommerz gateway base URL                      |
| `SSLCOMMERZ_VALIDATION_URL` | SSLCommerz validation API URL                    |
| `SSLCOMMERZ_IPN_URL`        | SSLCommerz IPN webhook URL                       |

---

## Project Structure

```
src/
  app.ts                    # Express app setup (CORS, middleware, routes, error handlers)
  server.ts                 # HTTP server entrypoint
  config/
    index.ts                # Typed config object from environment variables
    database.ts             # Singleton PrismaClient instance
    nodemailer.config.ts    # Nodemailer transporter setup
  interface/
    error.interface.ts      # TErrorSources type
    global.interface.ts     # IPagination, ISuccessResponse, IErrorResponse, etc.
  middlewares/
    authMiddleware.ts       # auth() — verifies Bearer JWT, attaches req.user
    authorizeMiddleware.ts  # authorize(roles[]) — role-based access control
    validateRequest.ts      # validateRequest(schema) — Zod schema validation
    errorHandler.ts         # globalErrorHandler, notFoundHandler
  modules/
    auth/                   # Login, logout, refresh token, password, email verification
    user/                   # Registration, profile management
    task/                   # Task CRUD, status transitions
    application/            # Apply, approve, reject, withdraw applications
    payment/                # Cash and online payment initiation/confirmation
    wallet/                 # Wallet balance, transactions, commission dues
  routes/
    index.ts                # Mounts all module routers under /api/v1
    demo.routes.ts          # Temporary demo/test routes
  types/
    global.d.ts             # Global TypeScript type augmentations
  utils/
    appError.ts             # AppError class
    asyncHandler.ts         # asyncHandler() wrapper
    sendResponse.ts         # sendResponse() + ResponseHandler class
    createToken.ts          # createToken() — JWT sign utility
    createTnxId.ts          # createTnxId(prefix) — transaction ID generator
    query.ts                # parseQuery(), buildPrismaQuery(), buildMeta()
    sendEmail.ts            # Email sending utility
    index.ts                # Re-exports all utils
```

---

## Module Anatomy

Every module follows this consistent structure:

```
<module>/
  <module>.route.ts        # Express Router — defines endpoints and chains middlewares
  <module>.controller.ts   # Request handlers — extract input, call service, send response
  <module>.service.ts      # Business logic — all Prisma queries live here
  <module>.validation.ts   # Zod schemas for request validation
  <module>.interface.ts    # TypeScript types/interfaces for the module
  <module>.constant.ts     # Module-level constants (sortable fields, omit sets, etc.)
```

---

## API Routes

All routes are prefixed with `/api/v1`.

| Module      | Base Path             |
| ----------- | --------------------- |
| Auth        | `/api/v1/auth`        |
| User        | `/api/v1/user`        |
| Task        | `/api/v1/task`        |
| Application | `/api/v1/application` |
| Payment     | `/api/v1/payment`     |
| Wallet      | `/api/v1/wallet`      |
| Demo        | `/api/v1/demo`        |

### Auth (`/api/v1/auth`)

| Method | Path                       | Auth | Description                           |
| ------ | -------------------------- | ---- | ------------------------------------- |
| POST   | `/login`                   | —    | Login, returns access + refresh token |
| POST   | `/logout`                  | —    | Clears refresh token cookie           |
| POST   | `/refresh-token`           | —    | Issues new access token               |
| GET    | `/current-user`            | JWT  | Get authenticated user                |
| GET    | `/loggedin-user`           | JWT  | Alias for current-user                |
| POST   | `/update-password`         | JWT  | Change password                       |
| POST   | `/forgot-password`         | —    | Send password reset email             |
| POST   | `/reset-password`          | —    | Reset password with token             |
| POST   | `/send-verification-email` | —    | Send email verification               |
| POST   | `/verify-email`            | —    | Verify email with token               |

### User (`/api/v1/user`)

| Method | Path                    | Auth | Roles | Description              |
| ------ | ----------------------- | ---- | ----- | ------------------------ |
| GET    | `/`                     | —    | —     | Get all users (temp)     |
| POST   | `/register/credentials` | —    | —     | Register with email/pass |
| GET    | `/my-profile`           | JWT  | USER  | Get own profile          |
| PATCH  | `/complete-profile`     | JWT  | USER  | Complete user profile    |
| GET    | `/:id`                  | —    | —     | Get user by ID           |
| PATCH  | `/update/:id`           | JWT  | USER  | Update user info         |
| PATCH  | `/update-avatar`        | JWT  | USER  | Update profile avatar    |
| DELETE | `/delete-account`       | JWT  | USER  | Soft-delete own account  |

### Task (`/api/v1/task`)

| Method | Path                      | Auth | Roles | Description                    |
| ------ | ------------------------- | ---- | ----- | ------------------------------ |
| POST   | `/post-task`              | JWT  | USER  | Create a new task              |
| PATCH  | `/update-task/:id`        | JWT  | USER  | Update task details            |
| DELETE | `/delete-task/:id`        | JWT  | USER  | Soft-delete a task             |
| POST   | `/:taskId/image`          | JWT  | USER  | Add images to task (max 5)     |
| GET    | `/`                       | —    | —     | Get all tasks (with filtering) |
| GET    | `/:id`                    | —    | —     | Get task by ID                 |
| PATCH  | `/mark-in-progress/:id`   | JWT  | USER  | Mark task as in-progress       |
| PATCH  | `/mark-completed/:id`     | JWT  | USER  | Tasker marks task completed    |
| PATCH  | `/approve-completion/:id` | JWT  | USER  | Poster approves completion     |
| PATCH  | `/request-revision/:id`   | JWT  | USER  | Poster requests revision       |

### Application (`/api/v1/application`)

| Method | Path                       | Auth | Roles | Description                   |
| ------ | -------------------------- | ---- | ----- | ----------------------------- |
| POST   | `/:taskId`                 | JWT  | USER  | Submit application for a task |
| GET    | `/my-applications`         | JWT  | USER  | Get own applications          |
| GET    | `/task/:taskId`            | JWT  | USER  | Get all applications for task |
| GET    | `/:applicationId`          | JWT  | USER  | Get application by ID         |
| PATCH  | `/approve/:applicationId`  | JWT  | USER  | Approve an application        |
| PATCH  | `/reject/:applicationId`   | JWT  | USER  | Reject an application         |
| PATCH  | `/withdraw/:applicationId` | JWT  | USER  | Withdraw own application      |

### Payment (`/api/v1/payment`)

| Method | Path                       | Auth | Roles | Description                          |
| ------ | -------------------------- | ---- | ----- | ------------------------------------ |
| POST   | `/cash/init/:taskId`       | JWT  | USER  | Initiate cash payment                |
| PATCH  | `/cash/confirm/:paymentId` | JWT  | USER  | Confirm cash payment received        |
| PATCH  | `/cash/decline/:paymentId` | JWT  | USER  | Decline cash payment                 |
| POST   | `/online/init/:taskId`     | JWT  | USER  | Initiate online payment (SSLCommerz) |
| POST   | `/online/ipn-validate/`    | —    | —     | SSLCommerz IPN webhook handler       |
| GET    | `/user/payment-made`       | JWT  | USER  | Get payments made by user            |
| GET    | `/user/payment-received`   | JWT  | USER  | Get payments received by user        |
| GET    | `/:id`                     | JWT  | USER  | Get payment by ID                    |

### Wallet (`/api/v1/wallet`)

| Method | Path                         | Auth | Roles | Description                 |
| ------ | ---------------------------- | ---- | ----- | --------------------------- |
| GET    | `/my-wallet`                 | JWT  | USER  | Get wallet balance          |
| GET    | `/wallet-transactions`       | JWT  | USER  | Get all wallet transactions |
| GET    | `/wallet-transaction/:tnxId` | JWT  | USER  | Get transaction by ID       |
| GET    | `/commission-due`            | JWT  | USER  | Get pending commission dues |
| GET    | `/commission-due/:dueId`     | JWT  | USER  | Get commission due by ID    |
| PATCH  | `/commission-due/pay/:dueId` | JWT  | USER  | Pay a commission due        |

---

## Key Patterns & Conventions

### 1. Route Middleware Order

Every protected route follows this order:

```
router.verb('/path', auth, authorize([UserRole.X]), validateRequest(schema), controller)
```

### 2. Controller Pattern

Controllers are thin — they extract input, delegate to the service, and send a response:

```ts
const myController: RequestHandler = asyncHandler(async (req, res) => {
  const result = await myService(req.body, req.user!.id);
  return ResponseHandler.ok(res, "Success message", result, { path: req.path });
});
```

### 3. Service Pattern

All business logic and Prisma queries belong in services. Never query the database directly in a controller.

### 4. Error Handling

- Throw `new AppError(statusCode, message)` for operational errors.
- All controllers are wrapped in `asyncHandler()` which forwards errors to `globalErrorHandler`.
- `globalErrorHandler` handles `ZodError`, `Prisma.PrismaClientKnownRequestError`, and `AppError`.

### 5. Response Utilities

Use `ResponseHandler` static methods (preferred) or the legacy `sendResponse()`:

```ts
ResponseHandler.ok(res, message, data, options); // 200
ResponseHandler.created(res, message, data, options); // 201
ResponseHandler.unauthorized(res, message, path); // 401
ResponseHandler.notFound(res, message, path); // 404
```

All responses conform to `ISuccessResponse<T>` or `IErrorResponse` interfaces.

### 6. Validation

Zod schemas are structured with nested `body`, `params`, and/or `query` keys:

```ts
const schema = z.object({
  body: z.object({ ... }).strict(),
  params: z.object({ ... }).optional(),
  query: z.object({ ... }).optional(),
});
```

Pass to `validateRequest(schema)` middleware.

### 7. Pagination & Query Parsing

Use `parseQuery(req, options?)` from `src/utils/query.ts` to parse `page`, `limit`, `sortBy`, `sortOrder`, `searchTerm`, and filter fields from request query. Use `buildPrismaQuery()` and `buildMeta()` to construct Prisma `where`/`skip`/`take`/`orderBy` and pagination metadata.

### 8. Soft Deletes

`User` and `Task` models use soft deletes (`isDeleted`, `deletedAt`, `deletedBy`). Always filter `isDeleted: false` in queries unless explicitly needed otherwise.

### 9. Field Omission

Sensitive fields are omitted via Prisma `omit` option using constants, e.g.:

```ts
taskSensitiveFieldsOwner; // omits: isDeleted, deletedAt, deletedBy
taskSensitiveFieldsPublic; // omits: above + approvedApplicationId, agreedCompensation
```

### 10. Transaction IDs

Use `createTnxId("TNX")` for payment transactions and `createTnxId("WTNX")` for wallet transactions.

### 11. JWT Payload Shape

```ts
interface IJwtPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: string;
}
```

Access via `req.user` (attached by `auth` middleware). `req.user` is typed in `src/types/global.d.ts`.

---

## Database Schema (Prisma)

**Database:** PostgreSQL  
**ORM:** Prisma 6, client at `src/config/database.ts` (`export const prisma`)

### Models

| Model               | Table                 | Notes                                    |
| ------------------- | --------------------- | ---------------------------------------- |
| `User`              | `users`               | Soft delete; security fields; wallet 1-1 |
| `Task`              | `tasks`               | Soft delete; status machine; geo coords  |
| `Application`       | `applications`        | Unique per (applicant, task)             |
| `Review`            | `reviews`             | Unique per (author, task)                |
| `Image`             | `images`              | Task images                              |
| `Message`           | `messages`            | Thread support via self-relation         |
| `Location`          | `locations`           | Reference location data                  |
| `Payment`           | `payments`            | Cash + Online; SSLCommerz integration    |
| `Wallet`            | `wallets`             | One per user                             |
| `WalletTransaction` | `wallet_transactions` | Debit/credit ledger                      |
| `CommissionDue`     | `commission_dues`     | Platform commission tracking             |

### Key Enums

| Enum                | Values                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserRole`          | `USER`, `ADMIN`, `MODERATOR`                                                                                                                                      |
| `UserProfileStatus` | `INCOMPLETE`, `COMPLETE`, `SUSPENDED`                                                                                                                             |
| `TaskStatus`        | `DRAFT`, `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REVIEW`, `PAYMENT_PROCESSING`, `COMPLETED`, `PAYMENT_FAILED`, `DISPUTED`, `CANCELLED`, `EXPIRED`, `REFUNDED` |
| `TaskPriority`      | `LOW`, `MEDIUM`, `HIGH`, `URGENT`                                                                                                                                 |
| `TaskCategory`      | `DELIVERY`, `CLEANING`, `REPAIR`, `TUTORING`, `GARDENING`, `MOVING`, `PET_CARE`, `TECH_SUPPORT`, `OTHER`                                                          |
| `ApplicationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`                                                                                                                    |
| `PaymentMethod`     | `CASH`, `ONLINE`                                                                                                                                                  |
| `Provider`          | `GOOGLE`, `CREDENTIALS`                                                                                                                                           |

### Task Status Flow

```
DRAFT → OPEN → ASSIGNED → IN_PROGRESS → PENDING_REVIEW → PAYMENT_PROCESSING → COMPLETED
                                                       ↘ (revision) → IN_PROGRESS
                                                                              ↘ PAYMENT_FAILED
```

---

## Authentication Flow

1. **Register:** `POST /api/v1/user/register/credentials` — hashes password, creates user.
2. **Login:** `POST /api/v1/auth/login` — verifies credentials, returns `accessToken` (in body) + `refreshToken` (httpOnly cookie, 7 days).
3. **Protected requests:** include `Authorization: Bearer <accessToken>` header.
4. **Token refresh:** `POST /api/v1/auth/refresh-token` — validates refresh token cookie, issues new access token.
5. **Email verification:** send verification → user receives token → POST `/verify-email` with token.

---

## Payment Flow

### Cash Payment

1. Task reaches `PAYMENT_PROCESSING` status (after poster approves completion).
2. Poster calls `POST /payment/cash/init/:taskId` — creates a `PENDING` cash payment record.
3. Poster confirms cash handed over: `PATCH /payment/cash/confirm/:paymentId`.
4. Task status moves to `COMPLETED`; wallet credited; commission due created.
5. Alternatively poster declines: `PATCH /payment/cash/decline/:paymentId`.

### Online Payment (SSLCommerz)

1. Poster calls `POST /payment/online/init/:taskId` — creates SSLCommerz session, returns payment URL.
2. User completes payment on SSLCommerz gateway.
3. SSLCommerz calls `POST /payment/online/ipn-validate/` IPN webhook — backend validates and settles.

---

## TypeScript Conventions

- `strict: true` with additional checks: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`.
- `target: es2020`, `module: commonjs`.
- Source in `src/`, compiled to `dist/`.
- Use `Prisma` generated types for model shapes — do not redefine them manually.
- Module interfaces live in `<module>.interface.ts`; never put business types in controllers.

---

## Notes & Gotchas

- **CORS** is hardcoded to `http://localhost:3000` in `app.ts` — update for production via `FRONTEND_URL`.
- The `GET /api/v1/user/` (all users) route is temporary and should be removed before production.
- `agreedCompensation` on `Task` is set when an application is approved; it holds the applicant's `proposedCompensation`.
- Commission rate is platform-wide from config (`COMMISSION_RATE`), stored per-payment in `commissionRate` field.
- The `docs/` folder contains additional design notes: `auth-optimization.md`, `endpoint-list.md`, `schema-improvements.md`, `response-utility.md`.
- Current branch: `feature/pagination`. Default branch: `main`.
