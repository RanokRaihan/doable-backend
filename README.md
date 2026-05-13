# Doable - Backend API

A modern, scalable backend API for the **Doable** task marketplace built with **Node.js**, **TypeScript**, **Express**, and **Prisma**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey)
![Prisma](https://img.shields.io/badge/Prisma-7.x-purple)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Development](#development)

## Overview

**Doable** is a task marketplace that connects users who need tasks completed with skilled individuals who can help. The backend provides REST APIs for authentication, task management, applications, payments, wallet operations, and withdrawal management.

## Features

- **JWT Authentication** with access & refresh tokens (dual delivery for browser and mobile)
- **User Registration & Management** with email verification
- **Task Management** — Create, edit, list with filters, search & pagination; image management
- **Application System** — Apply for tasks, approve/reject/withdraw
- **Task Completion Flow** — In-progress, mark completed, request revisions, approve completion
- **Payment System** — Cash & online payments via SSLCommerz
- **Wallet Management** — Balance, transaction ledger, commission dues
- **Withdrawal System** — Saved payout methods, withdrawal requests with fund reservation
- **Role-based Access Control** — User, Admin, Moderator roles
- **Security** — Account locking (5 failed attempts), password reset, rate limiting, helmet headers, Zod validation

## Tech Stack

| Tool               | Version  | Purpose                                   |
| ------------------ | -------- | ----------------------------------------- |
| Node.js            | 18.x     | Runtime (CommonJS)                        |
| TypeScript         | ^5.9.2   | Language; strict mode                     |
| Express            | ^5.1.0   | HTTP framework                            |
| Prisma             | ^7.8.0   | ORM + migration tool                      |
| PostgreSQL         | —        | Database                                  |
| Zod                | ^4.1.5   | Schema validation                         |
| jsonwebtoken       | ^9.0.2   | JWT sign/verify                           |
| bcryptjs           | ^3.0.2   | Password hashing (12 rounds)              |
| nodemailer         | ^7.0.6   | SMTP email                                |
| sslcommerz-lts     | ^1.2.0   | SSLCommerz payment gateway client         |
| axios              | ^1.13.2  | HTTP client (payment service)             |
| crypto-js          | ^4.2.0   | Cryptographic utilities                   |
| helmet             | ^8.1.0   | HTTP security headers                     |
| cookie-parser      | ^1.4.7   | Cookie parsing                            |
| express-rate-limit | ^8.5.1   | IP-level rate limiting for auth endpoints |
| ts-node-dev        | ^2.0.0   | Dev server with hot reload                |

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 12+
- npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/RanokRaihan/Doable-backend.git
   cd Doable-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.sample .env
   ```

4. **Run database migrations**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## Environment Variables

Create a `.env` file based on `.env.sample`. All variables are loaded through `src/config/index.ts` — never access `process.env` directly in the codebase. `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are required at startup.

| Variable                 | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `PORT`                   | Server port (default: 5000)                             |
| `NODE_ENV`               | `development` or `production`                           |
| `DATABASE_URL`           | PostgreSQL connection string (required)                 |
| `APP_URL`                | Backend base URL                                        |
| `FRONTEND_URL`           | Frontend base URL (used in email links only)            |
| `CORS_ORIGIN`            | Allowed CORS origins; comma-separated for multiple      |
| `COMMISSION_RATE`        | Platform commission rate as decimal (e.g., `0.15`)      |
| `JWT_ACCESS_SECRET`      | Access token signing secret (required)                  |
| `JWT_REFRESH_SECRET`     | Refresh token signing secret (required)                 |
| `JWT_EXPIRES_IN`         | Access token expiry (e.g., `15m`)                       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g., `30d`)                      |
| `SMTP_HOST`              | SMTP host (default: smtp.gmail.com)                     |
| `SMTP_PORT`              | SMTP port (default: 587)                                |
| `SMTP_USER`              | SMTP username                                           |
| `SMTP_PASS`              | SMTP password                                           |
| `SMTP_SECURE`            | TLS flag (`"true"` or `"false"`, default `false`)       |
| `STORE_ID`               | SSLCommerz store ID                                     |
| `STORE_PASSWORD`         | SSLCommerz store password                               |
| `GATEWAY_BASE_URL`       | SSLCommerz gateway base URL                             |
| `VALIDATION_API_URL`     | SSLCommerz validation API URL                           |
| `IPN_URL`                | SSLCommerz IPN webhook URL                              |
| `SUCCESS_URL`            | SSLCommerz success callback URL (backend)               |
| `FAIL_URL`               | SSLCommerz fail callback URL (backend)                  |
| `CANCEL_URL`             | SSLCommerz cancel callback URL (backend)                |
| `SUCCESS_URL_FRONTEND`   | Frontend redirect after successful payment              |
| `FAIL_URL_FRONTEND`      | Frontend redirect after failed payment                  |
| `CANCEL_URL_FRONTEND`    | Frontend redirect after cancelled payment               |

## API Endpoints

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication (`/auth`)

| Method | Endpoint                        | Auth | Description                        |
| ------ | ------------------------------- | ---- | ---------------------------------- |
| POST   | `/auth/login`                   | —    | Login, returns access + refresh    |
| POST   | `/auth/logout`                  | —    | Clears refresh token cookie        |
| POST   | `/auth/refresh-token`           | —    | Issues new access + refresh tokens |
| GET    | `/auth/current-user`            | JWT  | Get authenticated user             |
| POST   | `/auth/update-password`         | JWT  | Change password                    |
| POST   | `/auth/forgot-password`         | —    | Send password reset email          |
| POST   | `/auth/reset-password`          | —    | Reset password with token          |
| GET    | `/auth/email-verification`      | JWT  | Get email verification status      |
| POST   | `/auth/send-verification-email` | JWT  | Send email verification link       |
| POST   | `/auth/verify-email`            | —    | Verify email with token            |

### Users (`/user`)

| Method | Endpoint                     | Auth | Description                       |
| ------ | ---------------------------- | ---- | --------------------------------- |
| POST   | `/user/register/credentials` | —    | Register with email/password      |
| GET    | `/user/my-profile`           | JWT  | Get own profile                   |
| PATCH  | `/user/complete-profile`     | JWT  | Complete profile (one-time)       |
| PATCH  | `/user/update-profile`       | JWT  | Update profile fields             |
| PATCH  | `/user/update-avatar`        | JWT  | Update profile avatar             |
| DELETE | `/user/delete-account`       | JWT  | Soft-delete own account           |
| GET    | `/user/:id/public`           | —    | Public profile with stats/reviews |
| GET    | `/user/:id`                  | —    | Basic public profile by ID        |

### Tasks (`/task`)

| Method | Endpoint                            | Auth         | Description                             |
| ------ | ----------------------------------- | ------------ | --------------------------------------- |
| GET    | `/task/all-task`                    | optional JWT | List tasks (filters, search, pagination)|
| GET    | `/task/recently-posted`             | optional JWT | Recently posted tasks                   |
| GET    | `/task/my-posted-tasks`             | JWT          | Tasks posted by current user            |
| GET    | `/task/my-posted-task/:taskId`      | JWT          | Specific task posted by current user    |
| GET    | `/task/:id/related`                 | —            | Up to 4 related tasks (same category)   |
| GET    | `/task/:id`                         | —            | Get task by ID                          |
| POST   | `/task/post-task`                   | JWT          | Create a new task                       |
| PATCH  | `/task/update-task/:id`             | JWT          | Update task (owner only)                |
| DELETE | `/task/delete-task/:id`             | JWT          | Soft-delete task (owner only)           |
| POST   | `/task/:taskId/image`               | JWT          | Add task images (max 5)                 |
| PATCH  | `/task/:taskId/image`               | JWT          | Replace/update task images              |
| DELETE | `/task/:taskId/image/:imageId`      | JWT          | Delete a single task image              |
| PATCH  | `/task/:taskId/mark-in-progress`    | JWT          | Assigned applicant starts work          |
| PATCH  | `/task/:taskId/mark-completed`      | JWT          | Assigned applicant marks done           |
| PATCH  | `/task/:taskId/approve-completion`  | JWT          | Poster approves completion              |
| PATCH  | `/task/:taskId/request-revision`    | JWT          | Poster requests revision                |

### Applications (`/application`)

| Method | Endpoint                              | Auth | Description                              |
| ------ | ------------------------------------- | ---- | ---------------------------------------- |
| POST   | `/application/:taskId`                | JWT  | Submit application for a task            |
| GET    | `/application/my-applications`        | JWT  | Get own applications                     |
| GET    | `/application/task/:taskId`           | JWT  | All applications for a task (owner only) |
| GET    | `/application/:applicationId`         | JWT  | Get application by ID                    |
| PATCH  | `/application/approve/:applicationId` | JWT  | Approve application (task owner)         |
| PATCH  | `/application/reject/:applicationId`  | JWT  | Reject application (task owner)          |
| PATCH  | `/application/withdraw/:applicationId`| JWT  | Withdraw own application                 |

### Payments (`/payment`)

| Method | Endpoint                           | Auth | Description                            |
| ------ | ---------------------------------- | ---- | -------------------------------------- |
| POST   | `/payment/cash/init/:taskId`       | JWT  | Initiate cash payment                  |
| PATCH  | `/payment/cash/confirm/:paymentId` | JWT  | Confirm cash payment received          |
| PATCH  | `/payment/cash/decline/:paymentId` | JWT  | Decline cash payment                   |
| POST   | `/payment/online/init/:taskId`     | JWT  | Initiate online payment (SSLCommerz)   |
| POST   | `/payment/success`                 | —    | SSLCommerz success callback (redirect) |
| POST   | `/payment/fail`                    | —    | SSLCommerz fail callback (redirect)    |
| POST   | `/payment/cancel`                  | —    | SSLCommerz cancel callback (redirect)  |
| POST   | `/payment/online/ipn-validate/`    | —    | SSLCommerz IPN webhook                 |
| GET    | `/payment/user/payment-made`       | JWT  | Payments made by user                  |
| GET    | `/payment/user/payment-received`   | JWT  | Payments received by user              |
| GET    | `/payment/session/:sessionToken`   | JWT  | Payment by session token               |
| GET    | `/payment/:id`                     | JWT  | Get payment by ID                      |

### Withdrawals (`/withdrawal`)

| Method | Endpoint                                 | Auth | Description                       |
| ------ | ---------------------------------------- | ---- | --------------------------------- |
| POST   | `/withdrawal/my-methods`                 | JWT  | Create a withdrawal method        |
| GET    | `/withdrawal/my-methods`                 | JWT  | List active withdrawal methods    |
| GET    | `/withdrawal/my-methods/:id`             | JWT  | Get withdrawal method by ID       |
| PATCH  | `/withdrawal/my-methods/:id/set-default` | JWT  | Set method as default             |
| PATCH  | `/withdrawal/my-methods/:id`             | JWT  | Update withdrawal method          |
| DELETE | `/withdrawal/my-methods/:id`             | JWT  | Soft-delete withdrawal method     |
| POST   | `/withdrawal/my-requests`                | JWT  | Create withdrawal request         |
| GET    | `/withdrawal/my-requests`                | JWT  | List own withdrawal requests      |
| GET    | `/withdrawal/my-requests/:id`            | JWT  | Get withdrawal request by ID      |
| PATCH  | `/withdrawal/my-requests/:id`            | JWT  | Edit PENDING withdrawal request   |
| PATCH  | `/withdrawal/my-requests/:id/cancel`     | JWT  | Cancel PENDING withdrawal request |

### Wallet (`/wallet`)

| Method | Endpoint                             | Auth | Description                     |
| ------ | ------------------------------------ | ---- | ------------------------------- |
| GET    | `/wallet/my-wallet`                  | JWT  | Get wallet balance              |
| GET    | `/wallet/wallet-transactions`        | JWT  | All wallet transactions         |
| GET    | `/wallet/wallet-transaction/:tnxId`  | JWT  | Transaction by record ID (cuid) |
| GET    | `/wallet/commission-due`             | JWT  | All pending commission dues     |
| GET    | `/wallet/commission-due/:dueId`      | JWT  | Commission due by ID            |
| PATCH  | `/wallet/commission-due/pay/:dueId`  | JWT  | Pay commission due from wallet  |

### Response Format

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "statusCode": 200,
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/endpoint",
  "data": {},
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

**Error Response:**

```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "timestamp": "2025-01-23T10:30:00.000Z",
  "error": {
    "type": "VALIDATION_ERROR",
    "errorSources": [{ "path": "email", "message": "Email is required" }]
  }
}
```

## Project Structure

```
src/
├── config/
│   ├── database.ts           # Prisma singleton (export const prisma)
│   ├── index.ts              # All env vars via typed Config object
│   └── nodemailer.config.ts  # Nodemailer SMTP transporter
├── interface/                # Shared TypeScript interfaces
├── middlewares/
│   ├── authMiddleware.ts     # auth() + optionalAuth()
│   ├── authorizeMiddleware.ts# authorize([roles])
│   ├── errorHandler.ts       # globalErrorHandler + notFoundHandler
│   └── validateRequest.ts    # Zod schema validation
├── modules/
│   ├── auth/                 # Authentication & token management
│   ├── user/                 # User registration & profile management
│   ├── task/                 # Task CRUD, images, status transitions
│   ├── application/          # Application lifecycle
│   ├── payment/              # Cash & SSLCommerz online payments
│   ├── withdrawal/           # Withdrawal methods & requests
│   └── wallet/               # Wallet balance, transactions, commissions
├── routes/
│   └── index.ts              # Registers all module routers under /api/v1
├── types/
│   └── global.d.ts           # Augments Express Request with req.user
├── utils/
│   ├── appError.ts           # AppError custom class
│   ├── asyncHandler.ts       # Async error propagation wrapper
│   ├── createToken.ts        # JWT sign utility
│   ├── createTnxId.ts        # Transaction ID generator (TNX-..., WTNX-...)
│   ├── query.ts              # Pagination/sort/filter/search helpers
│   ├── sendEmail.ts          # Nodemailer dispatch
│   ├── sendResponse.ts       # ResponseHandler static methods
│   ├── time.ts               # Time utilities
│   └── index.ts              # Re-exports
├── app.ts                    # Express setup
└── server.ts                 # HTTP server entry point

prisma/
├── migrations/               # Database migrations
└── schema.prisma             # Database schema
```

Each module follows this six-file pattern:

| File                       | Purpose                              |
| -------------------------- | ------------------------------------ |
| `<module>.route.ts`        | Route definitions                    |
| `<module>.controller.ts`   | HTTP request handling (thin)         |
| `<module>.service.ts`      | Business logic & Prisma queries      |
| `<module>.validation.ts`   | Zod validation schemas               |
| `<module>.interface.ts`    | TypeScript types                     |
| `<module>.constant.ts`     | Field omission constants             |

## Development

### Available Scripts

```bash
npm run dev    # Start dev server with hot reload (ts-node-dev --respawn --transpile-only)
npm run build  # Compile TypeScript to dist/
npm run start  # Start production server from dist/
```

### Database Commands

```bash
npx prisma migrate dev --name <name>  # Create and apply a migration
npx prisma generate                   # Regenerate Prisma client after schema changes
npx prisma studio                     # Open database GUI
npx tsc --noEmit                      # Type-check without emitting
```

### Authentication

All protected endpoints require:

```
Authorization: Bearer <accessToken>
```

The refresh token is delivered both as an `httpOnly` cookie and in the response body — the body copy is for mobile/native clients that manage cookies manually.

### Query Parameters

List endpoints support standard pagination and filtering:

```
?page=1&limit=10&sortBy=createdAt&sortOrder=desc&searchTerm=keyword
```

### Error Codes

| Code                   | Meaning                                            |
| ---------------------- | -------------------------------------------------- |
| `VALIDATION_ERROR`     | Input validation failed (Zod)                      |
| `AUTHENTICATION_ERROR` | Login or token verification failed                 |
| `AUTHORIZATION_ERROR`  | Insufficient permissions                           |
| `NOT_FOUND`            | Resource not found                                 |
| `CONFLICT`             | Resource already exists                            |
| `ACCOUNT_LOCKED`       | Account locked after 5 consecutive failed logins   |
| `DATABASE_ERROR`       | Prisma / database-level error                      |

---
