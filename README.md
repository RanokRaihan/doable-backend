# Get It Done - Backend API

A modern, scalable backend API for the **Get It Done** task management platform built with **Node.js**, **TypeScript**, **Express**, and **Prisma**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey)
![Prisma](https://img.shields.io/badge/Prisma-6.x-purple)
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

**Get It Done** is a task management marketplace that connects users who need tasks completed with skilled individuals who can help. The backend provides robust APIs for authentication, task management, applications, payments, and wallet operations.

## Features

### Core Functionality

- ✅ **JWT Authentication** with access & refresh tokens
- ✅ **User Registration & Management** with email verification
- ✅ **Task Management** - Create, edit, list with filters, search & pagination
- ✅ **Application System** - Apply for tasks, approve/reject, withdraw
- ✅ **Task Completion Flow** - Mark in-progress, completed, request revisions
- ✅ **Payment System** - Cash & online payments via SSLCommerz
- ✅ **Wallet Management** - Track balance, transactions, and commission dues
- ✅ **Role-based Access Control** - User, Admin, Moderator roles
- ✅ **Security** - Account locking, password reset, input validation with Zod

## Tech Stack

- **Runtime**: Node.js 18.x
- **Language**: TypeScript 5.x
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Email**: Nodemailer
- **Payment Gateway**: SSLCommerz

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/RanokRaihan/get-it-done-backend.git
   cd get-it-done-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   ```

4. **Setup database**

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## Environment Variables

Create a `.env` file with the following:

```bash
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/getitdone_db

# JWT
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Payment Gateway (SSLCommerz)
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_BASE_URL=https://sandbox.sslcommerz.com

# Commission (as decimal: 0.15 = 15%)
COMMISSION_RATE=0.15
```

## API Endpoints

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

| Method | Endpoint                        | Description                  |
| ------ | ------------------------------- | ---------------------------- |
| POST   | `/auth/login`                   | User login                   |
| POST   | `/auth/logout`                  | User logout                  |
| POST   | `/auth/refresh-token`           | Refresh access token         |
| GET    | `/auth/current-user`            | Get authenticated user       |
| POST   | `/auth/update-password`         | Change password              |
| POST   | `/auth/forgot-password`         | Request password reset       |
| POST   | `/auth/reset-password`          | Reset password with token    |
| POST   | `/auth/send-verification-email` | Send email verification link |
| POST   | `/auth/verify-email`            | Verify email with token      |

### User Management

| Method | Endpoint                     | Description                  |
| ------ | ---------------------------- | ---------------------------- |
| POST   | `/user/register/credentials` | Register new user            |
| GET    | `/user/my-profile`           | Get user's own profile       |
| PATCH  | `/user/complete-profile`     | Complete profile information |
| PATCH  | `/user/update-profile`       | Update profile               |
| PATCH  | `/user/update-avatar`        | Update profile picture       |
| DELETE | `/user/delete-account`       | Soft delete account          |
| GET    | `/user/:id`                  | Get public user profile      |
| GET    | `/user`                      | Get all users                |

### Tasks

| Method | Endpoint                           | Description                                      |
| ------ | ---------------------------------- | ------------------------------------------------ |
| POST   | `/task/post-task`                  | Create new task                                  |
| GET    | `/task/all-task`                   | Get all tasks (with filters, search, pagination) |
| GET    | `/task/:id`                        | Get task details                                 |
| PATCH  | `/task/update-task/:id`            | Update task                                      |
| DELETE | `/task/delete-task/:id`            | Soft delete task                                 |
| PATCH  | `/task/:taskId/mark-in-progress`   | Mark task as in-progress                         |
| PATCH  | `/task/:taskId/mark-completed`     | Mark task as completed                           |
| PATCH  | `/task/:taskId/approve-completion` | Approve task completion                          |
| PATCH  | `/task/:taskId/request-revision`   | Request task revision                            |

### Applications

| Method | Endpoint                       | Description                 |
| ------ | ------------------------------ | --------------------------- |
| POST   | `/application/:taskId`         | Apply for a task            |
| GET    | `/application/my-applications` | Get user's applications     |
| GET    | `/application/task/:taskId`    | Get applications for a task |
| GET    | `/application/:applicationId`  | Get application details     |
| PATCH  | `/application/approve/:appId`  | Approve application         |
| PATCH  | `/application/reject/:appId`   | Reject application          |
| PATCH  | `/application/withdraw/:appId` | Withdraw application        |

### Payments

| Method | Endpoint                           | Description                |
| ------ | ---------------------------------- | -------------------------- |
| POST   | `/payment/cash/init/:taskId`       | Initiate cash payment      |
| PATCH  | `/payment/cash/confirm/:paymentId` | Confirm cash payment       |
| PATCH  | `/payment/cash/decline/:paymentId` | Decline cash payment       |
| POST   | `/payment/online/init/:taskId`     | Initiate online payment    |
| POST   | `/payment/online/ipn-validate`     | Validate IPN from gateway  |
| GET    | `/payment/user/payment-made`       | Get payments user made     |
| GET    | `/payment/user/payment-received`   | Get payments user received |
| GET    | `/payment/:id`                     | Get payment details        |

### Wallet

| Method | Endpoint                         | Description                |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/wallet/my-wallet`              | Get wallet balance         |
| GET    | `/wallet/wallet-transactions`    | Get transaction history    |
| GET    | `/wallet/wallet-transaction/:id` | Get transaction details    |
| GET    | `/wallet/commission-due`         | Get commission dues        |
| GET    | `/wallet/commission-due/:id`     | Get commission due details |
| PATCH  | `/wallet/commission-due/pay/:id` | Pay commission due         |

### Response Format

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "statusCode": 200,
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/endpoint",
  "data": {
    /* response data */
  },
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
├── config/              # Configuration
│   ├── database.ts
│   ├── index.ts
│   └── nodemailer.config.ts
├── interface/           # TypeScript interfaces
├── middlewares/         # Express middlewares
│   ├── authMiddleware.ts
│   ├── authorizeMiddleware.ts
│   ├── errorHandler.ts
│   └── validateRequest.ts
├── modules/             # Feature modules
│   ├── auth/            # Authentication
│   ├── user/            # User management
│   ├── task/            # Task management
│   ├── application/     # Task applications
│   ├── payment/         # Payment processing
│   └── wallet/          # Wallet operations
├── utils/               # Utilities
│   ├── query.ts         # Pagination, search, filter, sort
│   ├── sendResponse.ts  # Response formatting
│   ├── asyncHandler.ts  # Async error handling
│   ├── appError.ts      # Custom error class
│   └── sendEmail.ts     # Email service
├── app.ts               # Express setup
└── server.ts            # Server entry point

prisma/
├── migrations/          # Database migrations
└── schema.prisma        # Database schema
```

## Development

### Available Scripts

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm run start            # Start production server
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

### Module Structure

Each module follows this pattern:

- **controller.ts** - HTTP request handling
- **service.ts** - Business logic
- **route.ts** - Route definitions
- **validator.ts** - Zod validation schemas
- **interface.ts** - TypeScript types

### Authentication

All protected endpoints require `Authorization: Bearer {accessToken}` header.

Refresh token is sent as httpOnly cookie automatically by the server.

### Query Parameters

For list endpoints, use standard pagination & filtering:

```bash
?page=1&limit=10&sortBy=fieldName&sortOrder=asc&searchTerm=keyword
```

### Error Handling

The API uses custom error codes:

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Login/auth failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `ACCOUNT_LOCKED` - Account locked after failed attempts

---

**Built with ❤️ for Get It Done**
