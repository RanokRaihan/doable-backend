# AGENTS.md — Doable Backend

## Recent Changes

- 2026-05-04 — Added `GET /:id/related` public endpoint; returns up to 4 OPEN tasks sharing the same category as the given task
- 2026-05-02 — Confirmed enum sync after schema update: `PAYMENT_PROCESSING` fully removed from `TaskStatus`; `CLOSED` added to `ApplicationStatus`; all generated files, service logic, and api-contracts verified consistent
- 2026-05-01 — Updated `TaskStatus` enum: replaced `PAYMENT_PROCESSING` with `PAYMENT_PENDING` + `PAYMENT_INITIATED`; updated status machine in AGENTS.md and api-contract-task.md; added `CLOSED` to `ApplicationStatus` in api-contract-application.md
- 2026-04-27 — Split `api-contract.md` into `api-contracts/` (shared.md + one file per module); updated all references in AGENTS.md and CLAUDE.md; removed demo route section
- 2026-04-27 — Full rewrite of AGENTS.md and CLAUDE.md; created `.github/copilot-instructions.md`; removed boilerplate and duplicate content; fixed all route tables; added Architectural Decisions section
- 2026-04-27 — Restructured context files; fixed task/user route tables; added missing routes (`my-posted-tasks`, `recently-posted`, `email-verification`); added Architectural Decisions section; aligned routes with actual code

---

## Annotated Module & Service Map

```
src/
  app.ts                      # Express setup: CORS (hardcoded localhost:3000), JSON body parser, route mount at /api/v1, globalErrorHandler, notFoundHandler
  server.ts                   # HTTP listen entrypoint

  config/
    index.ts                  # Single typed Config object; ALL env vars read here — never use process.env elsewhere
    database.ts               # Singleton PrismaClient exported as `prisma`; import this in services
    nodemailer.config.ts      # Nodemailer SMTP transporter setup

  interface/
    error.interface.ts        # TErrorSources type used by globalErrorHandler
    global.interface.ts       # IPagination, ISuccessResponse, IErrorResponse, IAuthUser
    index.d.ts                # Global declaration file

  middlewares/
    authMiddleware.ts         # auth() — verifies Bearer JWT, fetches user from DB, attaches req.user; throws 401 if missing/invalid/suspended
                              # optionalAuth() — same but does not block unauthenticated requests; used on public endpoints that show owner-specific data
    authorizeMiddleware.ts    # authorize(roles[]) — role-based access; must come after auth()
    validateRequest.ts        # validateRequest(schema) — validates req.body/params/query against nested Zod schema
    errorHandler.ts           # globalErrorHandler (AppError → structured error, ZodError → VALIDATION_ERROR, PrismaClientKnownRequestError → DATABASE_ERROR); notFoundHandler

  modules/
    auth/
      auth.route.ts           # Login, logout, refresh, password change, forgot/reset password, email verification routes
      auth.controller.ts      # Auth request handlers (thin — delegates to service)
      auth.service.ts         # Auth business logic: credential check, token issue, failed login counter, account lock, password reset (15-min token), email verification
      auth.validation.ts      # Zod schemas: loginValidationSchema, verifyEmailValidationSchema
      auth.interface.ts       # IJwtPayload, ILoginPayload types

    user/
      user.route.ts           # Registration, profile management, public profile routes
      user.controller.ts      # User request handlers
      user.service.ts         # User business logic: create (+ wallet), profile complete/update, avatar update, soft-delete, public profile with stats/reviews
      user.validator.ts       # Zod schemas: createUserSchema, completeUserProfileSchema, updateUserSchema, updateAvatarSchema, getPublicProfileSchema
      user.interface.ts       # User-specific payload types
      user.constant.ts        # User field omission constants

    task/
      task.route.ts           # Task CRUD, image management, status transitions, my-posted-tasks, recently-posted routes
      task.controller.ts      # Task request handlers
      task.service.ts         # Task business logic: CRUD, add/update/delete images, status transitions, my-tasks query, recently-posted query
      task.validator.ts       # Zod schemas: createTaskSchema, updateTaskSchema, addTaskImagesSchema, updateTaskImagesSchema, deleteTaskImageSchema, getAllTasksSchema, getAllMyTasksSchema, getMyPostedTaskSchema
      task.interface.ts       # CreateTaskPayload, UpdateTaskPayload types
      task.constant.ts        # taskSensitiveFieldsPublic, taskSensitiveFieldsOwner, taskSensitiveFieldsApplicant, TaskSearchFields, taskSortableFields, taskFilterableFields, taskMultiValueFilterFields

    application/
      application.route.ts    # Apply, my-applications, task applications, approve/reject/withdraw routes
      application.controller.ts # Application request handlers
      application.service.ts  # Application business logic: create, approve (sets task.agreedCompensation + task.approvedApplicationId, moves task → ASSIGNED), reject, withdraw
      application.validation.ts # Zod schemas for application endpoints
      application.interface.ts  # Application payload types
      application.constant.ts   # Application field constants

    payment/
      payment.route.ts        # Cash init/confirm/decline, online init, IPN webhook, payment history routes
      payment.controller.ts   # Payment request handlers
      payment.service.ts      # Payment business logic: cash flow, SSLCommerz online init, wallet credit, commission record creation
      payment.dummy.service.ts # IPN validation handler — NOTE: uses dummy logic, real SSLCommerz validation not yet implemented
      payment.utils.ts        # getDefaultDescription() and other payment helpers
      payment.validation.ts   # Zod schemas for payment endpoints
      payment.interface.ts    # IpnQuery and payment payload types
      payment.constant.ts     # Payment field omission constants (paymentSelectFieldsOwner, etc.)

    wallet/
      wallet.route.ts         # Wallet balance, transactions, commission dues routes
      wallet.controller.ts    # Wallet request handlers
      wallet.service.ts       # Wallet business logic: balance fetch, transaction list, commission due query/pay (deducts from balance, creates DUE_COMMISSION_DEDUCTION txn)
      wallet.validator.ts     # Zod schemas for wallet endpoints
      wallet.interface.ts     # Wallet payload types
      wallet.constant.ts      # Wallet field constants

  routes/
    index.ts                  # Registers all module routers under /api/v1
    demo.routes.ts            # Dev-only routes showcasing ResponseHandler patterns — remove before production

  types/
    global.d.ts               # Augments Express Request with req.user: IAuthUser

  utils/
    appError.ts               # AppError(statusCode, message, errorType?, path?) — throw for operational errors
    asyncHandler.ts           # asyncHandler(fn) — wraps async RequestHandlers, forwards errors to globalErrorHandler
    sendResponse.ts           # ResponseHandler static methods (ok, created, unauthorized, notFound, error, paginated, etc.) + legacy sendResponse()
    createToken.ts            # createToken(payload, secret, expiresIn) — JWT sign utility
    createTnxId.ts            # createTnxId(prefix) — generates prefixed IDs, e.g., "TNX-...", "WTNX-..."
    query.ts                  # parseQuery(), buildPrismaQuery(), buildMeta() — unified pagination/sort/filter/search utilities
    sendEmail.ts              # sendEmail(to, subject, html) — Nodemailer dispatch
    time.ts                   # getTimeRemaining(date) — returns { minutes, seconds } remaining to a future date
    index.ts                  # Re-exports: ResponseHandler, sendResponse, sendEmail, AppError, asyncHandler, createToken
```

---

## Tech Stack

| Tool           | Version  | Purpose                                                   |
| -------------- | -------- | --------------------------------------------------------- |
| Node.js        | CommonJS | Runtime (`"type": "commonjs"` in package.json)            |
| TypeScript     | ^5.9.2   | Language; strict mode + extra checks                      |
| Express        | ^5.1.0   | HTTP framework                                            |
| Prisma         | ^6.19.0  | ORM + migration tool                                      |
| PostgreSQL     | —        | Database (version managed by hosting)                     |
| Zod            | ^4.1.5   | Schema validation                                         |
| jsonwebtoken   | ^9.0.2   | JWT sign/verify                                           |
| bcryptjs       | ^3.0.2   | Password hashing                                          |
| nodemailer     | ^7.0.6   | SMTP email                                                |
| sslcommerz-lts | ^1.2.0   | SSLCommerz payment gateway client                         |
| axios          | ^1.13.2  | HTTP client (used in payment service)                     |
| crypto-js      | ^4.2.0   | Cryptographic utilities                                   |
| ts-node-dev    | ^2.0.0   | Dev server with hot reload (`--respawn --transpile-only`) |

---

## Database Pattern

- **ORM:** Prisma 6. Single client at `src/config/database.ts` (`export const prisma`).
- **Migrations:** `npx prisma migrate dev --name <name>`. Files in `prisma/migrations/`. One migration exists: `20260410233707_init`.
- **Schema file:** `prisma/schema.prisma`. After changes run `npx prisma generate`.
- **Soft deletes:** `User` and `Task` have `isDeleted: Boolean @default(false)`, `deletedAt`, `deletedBy`. Always filter `isDeleted: false` unless explicitly needed.
- **Decimal fields:** `baseCompensation`, `agreedCompensation`, `amount`, `commissionAmount`, `commissionRate`, `balance`, `balanceBefore`, `balanceAfter` are Prisma `Decimal` — serialized as strings in JSON responses.
- **Field omission:** Sensitive fields excluded at query time via Prisma `omit` option, using constants from `<module>.constant.ts`.

### Models

| Model               | Table                 | Key notes                                        |
| ------------------- | --------------------- | ------------------------------------------------ |
| `User`              | `users`               | Soft delete; wallet 1-1; failed login counter    |
| `Task`              | `tasks`               | Soft delete; status machine; geo coords optional |
| `Application`       | `applications`        | Unique per (applicant, task)                     |
| `Review`            | `reviews`             | Unique per (author, task)                        |
| `Image`             | `images`              | Task images; max 5 per task                      |
| `Message`           | `messages`            | Thread support via self-relation                 |
| `Location`          | `locations`           | Reference location data                          |
| `Payment`           | `payments`            | Cash + Online; SSLCommerz integration            |
| `Wallet`            | `wallets`             | One per user; created on registration            |
| `WalletTransaction` | `wallet_transactions` | Debit/credit ledger                              |
| `CommissionDue`     | `commission_dues`     | Platform commission tracking                     |

### Task Status Machine

```
DRAFT → OPEN → ASSIGNED → IN_PROGRESS → PENDING_REVIEW → PAYMENT_PENDING → PAYMENT_INITIATED → COMPLETED
                                                       ↘ (revision) → IN_PROGRESS
                                                                 ↘ PAYMENT_FAILED / DISPUTED / CANCELLED / EXPIRED / REFUNDED
```

---

## Auth Pattern

See `api-contracts/api-contract-auth.md` for full token shapes, cookie details, and 401 behavior. Summary:

- **Access token:** HS256, signed with `JWT_ACCESS_SECRET`, sent via `Authorization: Bearer <token>`
- **Refresh token:** HS256, signed with `JWT_REFRESH_SECRET`, stored as `httpOnly` cookie AND returned in response body (dual delivery for browser + mobile clients)
- **JWT payload:** `{ userId, email, name, role: UserRole, profileStatus, emailVerified }`
- **`auth()` middleware:** verifies token → fetches user from DB → attaches to `req.user`. Throws 401 for missing/invalid/expired token or suspended account.
- **`optionalAuth()` middleware:** same flow but does not throw if no token — used on public endpoints that show owner-specific context when authenticated
- **Account locking:** `User.failedLoginAttempts` incremented on bad password. Locks at **40 attempts** (TODO: change to 5 for production)
- **Email verification:** `POST /auth/send-verification-email` → email with raw token → `POST /auth/verify-email` with that token
- **Password reset:** `POST /auth/forgot-password` → email link to `FRONTEND_URL/reset-password?token=<token>&email=<email>` (token expires in 15 min) → `POST /auth/reset-password`

---

## API Routes

Full request/response contracts are in `api-contracts/` — see `api-contracts/index.md` for the module index. This table is for navigation only.

### Auth (`/api/v1/auth`)

| Method | Path                       | Auth | Description                        |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/login`                   | —    | Login, returns access + refresh    |
| POST   | `/logout`                  | —    | Clears refresh token cookie        |
| POST   | `/refresh-token`           | —    | Issues new access + refresh tokens |
| GET    | `/current-user`            | JWT  | Get authenticated user             |
| GET    | `/loggedin-user`           | JWT  | Alias for `/current-user`          |
| POST   | `/update-password`         | JWT  | Change password (CREDENTIALS only) |
| POST   | `/forgot-password`         | —    | Send password reset email          |
| POST   | `/reset-password`          | —    | Reset password with token          |
| GET    | `/email-verification`      | JWT  | Get email verification status      |
| POST   | `/send-verification-email` | JWT  | Send email verification            |
| POST   | `/verify-email`            | —    | Verify email with token            |

### User (`/api/v1/user`)

| Method | Path                    | Auth | Roles | Description                        |
| ------ | ----------------------- | ---- | ----- | ---------------------------------- |
| GET    | `/`                     | —    | —     | Get all users (TEMP — remove prod) |
| POST   | `/register/credentials` | —    | —     | Register with email/password       |
| GET    | `/my-profile`           | JWT  | USER  | Get own profile                    |
| PATCH  | `/complete-profile`     | JWT  | USER  | Complete profile (one-time)        |
| PATCH  | `/update-profile`       | JWT  | USER  | Update profile fields              |
| PATCH  | `/update-avatar`        | JWT  | USER  | Update profile avatar              |
| DELETE | `/delete-account`       | JWT  | USER  | Soft-delete own account            |
| GET    | `/:id/public`           | —    | —     | Public profile with stats/reviews  |
| GET    | `/:id`                  | —    | —     | Basic public profile by ID         |

### Task (`/api/v1/task`)

| Method | Path                          | Auth         | Roles | Description                          |
| ------ | ----------------------------- | ------------ | ----- | ------------------------------------ |
| GET    | `/all-task`                   | optional JWT | —     | List tasks with filters/pagination   |
| GET    | `/recently-posted`            | optional JWT | —     | Recently posted tasks                |
| GET    | `/my-posted-tasks`            | JWT          | USER  | All tasks posted by current user     |
| GET    | `/my-posted-task/:taskId`     | JWT          | USER  | Specific task posted by current user |
| GET    | `/:id/related`                | —            | —     | Up to 4 related tasks (same category)|
| GET    | `/:id`                        | —            | —     | Get task by ID                       |
| POST   | `/post-task`                  | JWT          | USER  | Create a new task                    |
| PATCH  | `/update-task/:id`            | JWT          | USER  | Update task (owner only)             |
| DELETE | `/delete-task/:id`            | JWT          | USER  | Soft-delete task (owner only)        |
| POST   | `/:taskId/image`              | JWT          | USER  | Add images (max 5, owner only)       |
| PATCH  | `/:taskId/image`              | JWT          | USER  | Replace/update task images           |
| DELETE | `/:taskId/image/:imageId`     | JWT          | USER  | Delete a single task image           |
| PATCH  | `/:taskId/mark-in-progress`   | JWT          | USER  | Assigned applicant starts work       |
| PATCH  | `/:taskId/mark-completed`     | JWT          | USER  | Assigned applicant marks done        |
| PATCH  | `/:taskId/approve-completion` | JWT          | USER  | Poster approves completion           |
| PATCH  | `/:taskId/request-revision`   | JWT          | USER  | Poster requests revision             |

### Application (`/api/v1/application`)

| Method | Path                       | Auth | Roles | Description                              |
| ------ | -------------------------- | ---- | ----- | ---------------------------------------- |
| POST   | `/:taskId`                 | JWT  | USER  | Submit application for a task            |
| GET    | `/my-applications`         | JWT  | USER  | Get own applications                     |
| GET    | `/task/:taskId`            | JWT  | USER  | All applications for a task (owner only) |
| GET    | `/:applicationId`          | JWT  | USER  | Application by ID                        |
| PATCH  | `/approve/:applicationId`  | JWT  | USER  | Approve application (task owner)         |
| PATCH  | `/reject/:applicationId`   | JWT  | USER  | Reject application (task owner)          |
| PATCH  | `/withdraw/:applicationId` | JWT  | USER  | Withdraw own application                 |

### Payment (`/api/v1/payment`)

| Method | Path                       | Auth | Roles | Description                          |
| ------ | -------------------------- | ---- | ----- | ------------------------------------ |
| POST   | `/cash/init/:taskId`       | JWT  | USER  | Initiate cash payment                |
| PATCH  | `/cash/confirm/:paymentId` | JWT  | USER  | Confirm cash payment received        |
| PATCH  | `/cash/decline/:paymentId` | JWT  | USER  | Decline cash payment                 |
| POST   | `/online/init/:taskId`     | JWT  | USER  | Initiate online payment (SSLCommerz) |
| POST   | `/online/ipn-validate/`    | —    | —     | SSLCommerz IPN webhook               |
| GET    | `/user/payment-made`       | JWT  | USER  | Payments made by user                |
| GET    | `/user/payment-received`   | JWT  | USER  | Payments received by user            |
| GET    | `/:id`                     | JWT  | USER  | Get payment by ID                    |

### Wallet (`/api/v1/wallet`)

| Method | Path                         | Auth | Roles | Description                     |
| ------ | ---------------------------- | ---- | ----- | ------------------------------- |
| GET    | `/my-wallet`                 | JWT  | USER  | Get wallet balance              |
| GET    | `/wallet-transactions`       | JWT  | USER  | All wallet transactions         |
| GET    | `/wallet-transaction/:tnxId` | JWT  | USER  | Transaction by record ID (cuid) |
| GET    | `/commission-due`            | JWT  | USER  | All pending commission dues     |
| GET    | `/commission-due/:dueId`     | JWT  | USER  | Commission due by ID            |
| PATCH  | `/commission-due/pay/:dueId` | JWT  | USER  | Pay commission due from wallet  |

---

## Background Jobs / Queues

None. No cron, queue, or scheduled job infrastructure exists in this codebase.

---

## Key Conventions

- **Route registration order matters:** In the application router, `GET /my-applications` and `GET /task/:taskId` are registered **before** `GET /:applicationId` to prevent collision
- **`optionalAuth`** used on `/all-task` and `/recently-posted` — attaches `req.user` if token present but does not block unauthenticated requests
- **`wallet-transaction/:tnxId`** parameter is the Prisma record ID (cuid), **not** the `transactionId` string (e.g., `"WTNX-..."`)
- **CORS** is hardcoded to `http://localhost:3000` in `src/app.ts`. `FRONTEND_URL` env var is used **only** in email links, not for CORS
- **`agreedCompensation`** on `Task` is set during application approval, copied from `Application.proposedCompensation`
- **Commission rate** comes from `config.commissionRate` (platform-wide), stored per-payment in the `Payment.commissionRate` field
- **`payment.dummy.service.ts`** is the actual IPN handler currently in use — real SSLCommerz SDK validation is not yet wired up

---

## Environment Variables

All loaded in `src/config/index.ts`.

| Variable                    | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `PORT`                      | Server port (default: 5000)                             |
| `NODE_ENV`                  | `development` or `production`                           |
| `DATABASE_URL`              | PostgreSQL connection string (Prisma)                   |
| `APP_URL`                   | Backend base URL                                        |
| `FRONTEND_URL`              | Frontend base URL (email links only — not used by CORS) |
| `COMMISSION_RATE`           | Platform commission rate as decimal (e.g., 0.15)        |
| `JWT_ACCESS_SECRET`         | Access token signing secret                             |
| `JWT_REFRESH_SECRET`        | Refresh token signing secret                            |
| `JWT_EXPIRES_IN`            | Access token expiry (e.g., `15d`)                       |
| `JWT_REFRESH_EXPIRES_IN`    | Refresh token expiry (e.g., `30d`)                      |
| `SMTP_HOST`                 | SMTP host (default: smtp.gmail.com)                     |
| `SMTP_PORT`                 | SMTP port (default: 587)                                |
| `SMTP_USER`                 | SMTP username                                           |
| `SMTP_PASS`                 | SMTP password                                           |
| `SSLCOMMERZ_STORE_ID`       | SSLCommerz store ID                                     |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password                               |
| `SSLCOMMERZ_SUCCESS_URL`    | Payment success redirect URL                            |
| `SSLCOMMERZ_FAIL_URL`       | Payment failure redirect URL                            |
| `SSLCOMMERZ_CANCEL_URL`     | Payment cancel redirect URL                             |
| `SSLCOMMERZ_GATEWAY_URL`    | SSLCommerz gateway base URL                             |
| `SSLCOMMERZ_VALIDATION_URL` | SSLCommerz validation API URL                           |
| `SSLCOMMERZ_IPN_URL`        | SSLCommerz IPN webhook URL                              |

---

## Architectural Decisions

- **CommonJS over ESM:** `"type": "commonjs"` in package.json; `"module": "commonjs"` in tsconfig. All imports use `require` semantics.
- **Express 5:** Using `^5.1.0`, which handles async errors natively in route handlers. `asyncHandler` is still used for explicit error propagation and consistency.
- **Prisma `omit` for field exclusion:** Sensitive fields removed at query time via `omit` rather than post-query deletion. Constants defined per-module in `.constant.ts`.
- **Dual token delivery:** Refresh token returned both in response body and as httpOnly cookie — body copy for mobile/native clients that manage cookies manually.
- **Dummy IPN service:** `payment.dummy.service.ts` is the active IPN handler because the real SSLCommerz SDK validation is not yet integrated. Must be replaced before production.
- **Account lock threshold:** Currently 40 failed login attempts (intended: 5). Comment in `auth.service.ts` notes this is for testing. Must be fixed before production.
- **Single baseline migration:** Only one migration (`20260410233707_init`) exists. All schema history is in the initial migration.
- **No test infrastructure:** No test runner configured. `npm test` exits with error code 1.
