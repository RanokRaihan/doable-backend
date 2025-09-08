# 🚀 Get It Done - Backend API

A modern, scalable backend API for the **Get It Done** task management platform built with **Node.js**, **TypeScript**, **Express**, and **Prisma**.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey)
![Prisma](https://img.shields.io/badge/Prisma-6.x-purple)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**Get It Done** is a comprehensive task management platform that connects users who need tasks completed with skilled individuals who can help. The backend provides robust APIs for user management, task posting, application handling, messaging, and more.

### Key Capabilities

- **User Authentication & Authorization** with JWT
- **Task Management** with categories, priorities, and status tracking
- **Application System** for task assignments
- **Review & Rating System** for user feedback
- **Real-time Messaging** between users
- **File Upload** for task images and documents
- **Location-based** task filtering and search
- **Admin Dashboard** for platform management

## ✨ Features

### 🔐 Authentication & Security

- **JWT-based Authentication** with refresh tokens
- **Role-based Access Control** (User, Admin, Moderator)
- **Account Security** with login attempt tracking and account locking
- **Password Reset** functionality with secure tokens
- **Input Validation** with Zod schemas
- **Rate Limiting** and CORS protection

### 👥 User Management

- **User Registration & Login** with multiple providers
- **Profile Management** with detailed user information
- **Email Verification** system
- **User Preferences** and settings
- **Soft Delete** functionality for data integrity

### 📝 Task Management

- **CRUD Operations** for tasks
- **Task Categories** (Delivery, Cleaning, Repair, etc.)
- **Priority Levels** (Low, Medium, High, Urgent)
- **Status Tracking** (Draft, Open, In Progress, Completed, etc.)
- **Location-based** task posting
- **Image Upload** for task details
- **Compensation Management** with base and agreed amounts

### 📱 Application System

- **Task Applications** with proposals
- **Application Status** tracking
- **Approval Workflow** for task assignments
- **Application History** and management

### ⭐ Review & Rating

- **Bidirectional Reviews** between users
- **Rating System** (1-5 stars)
- **Review Comments** and feedback
- **Public/Private** review options

### 💬 Messaging

- **Real-time Messaging** between users
- **Thread Support** for organized conversations
- **Message Status** tracking (read/unread)
- **Task-specific** messaging

### 🔧 Admin Features

- **User Management** dashboard
- **Task Moderation** capabilities
- **Platform Analytics** and reporting
- **Content Management** tools

## 🛠 Tech Stack

### **Backend Core**

- **Node.js** 18.x - Runtime environment
- **TypeScript** 5.x - Type safety and development experience
- **Express.js** 5.x - Web framework
- **Prisma** 6.x - Database ORM and migration tool

### **Database & Storage**

- **PostgreSQL** - Primary database
- **Prisma Schema** - Database modeling and migrations

### **Authentication & Security**

- **JWT** (jsonwebtoken) - Authentication tokens
- **bcryptjs** - Password hashing
- **Zod** - Input validation and type safety
- **CORS** - Cross-origin resource sharing

### **Development Tools**

- **ts-node-dev** - Development server with hot reload
- **Prisma CLI** - Database management
- **ESLint & Prettier** - Code quality and formatting

### **Additional Libraries**

- **Nodemailer** - Email service integration
- **crypto-js** - Cryptographic utilities
- **dotenv** - Environment variable management

## 🏗 Architecture

### **Layered Architecture**

```
┌─────────────────┐
│   Controllers   │ ← HTTP Request/Response handling
├─────────────────┤
│    Services     │ ← Business logic and data processing
├─────────────────┤
│   Repositories  │ ← Data access layer (Prisma)
├─────────────────┤
│    Database     │ ← PostgreSQL with Prisma
└─────────────────┘
```

### **Key Principles**

- **Separation of Concerns** - Clear layer responsibilities
- **Single Responsibility** - Each module has one purpose
- **Dependency Injection** - Loosely coupled components
- **Error Handling** - Comprehensive error management
- **Type Safety** - Full TypeScript implementation

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **PostgreSQL** database
- **Git** for version control

### **Installation**

1. **Clone the repository**

   ```bash
   git clone https://github.com/RanokRaihan/get-it-done-backend.git
   cd get-it-done-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate deploy

   # Optional: Seed database
   npx prisma db seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/getitdone_db"

# JWT Configuration
JWT_ACCESS_SECRET=your_super_secret_access_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload (Optional)
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5MB

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100

# CORS Settings
CORS_ORIGIN=http://localhost:3000
```

### **Environment Variables Description**

| Variable                 | Description                          | Required |
| ------------------------ | ------------------------------------ | -------- |
| `PORT`                   | Server port number                   | ✅       |
| `NODE_ENV`               | Environment (development/production) | ✅       |
| `DATABASE_URL`           | PostgreSQL connection string         | ✅       |
| `JWT_ACCESS_SECRET`      | Secret for access tokens             | ✅       |
| `JWT_REFRESH_SECRET`     | Secret for refresh tokens            | ✅       |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiry time             | ✅       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry time            | ✅       |
| `SMTP_*`                 | Email service configuration          | ❌       |
| `UPLOAD_PATH`            | File upload directory                | ❌       |
| `CORS_ORIGIN`            | Allowed CORS origins                 | ❌       |

## 🗄 Database Setup

### **Using Docker (Recommended)**

1. **Start PostgreSQL with Docker**

   ```bash
   docker run --name getitdone-postgres \
     -e POSTGRES_DB=getitdone_db \
     -e POSTGRES_USER=admin \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Update DATABASE_URL in .env**
   ```bash
   DATABASE_URL="postgresql://admin:password@localhost:5432/getitdone_db"
   ```

### **Manual PostgreSQL Setup**

1. **Install PostgreSQL**

   ```bash
   # macOS
   brew install postgresql

   # Ubuntu
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create database and user**
   ```sql
   CREATE DATABASE getitdone_db;
   CREATE USER admin WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE getitdone_db TO admin;
   ```

### **Database Migration**

```bash
# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

## 📚 API Documentation

### **Base URL**

```
http://localhost:5000/api/v1
```

### **Authentication Endpoints**

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| `POST` | `/auth/register`        | User registration      |
| `POST` | `/auth/login`           | User login             |
| `POST` | `/auth/logout`          | User logout            |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password`  | Reset password         |
| `POST` | `/auth/change-password` | Change password        |
| `GET`  | `/auth/me`              | Get current user       |

### **User Management**

| Method   | Endpoint     | Description           |
| -------- | ------------ | --------------------- |
| `GET`    | `/users`     | Get all users (Admin) |
| `GET`    | `/users/:id` | Get user by ID        |
| `PUT`    | `/users/:id` | Update user           |
| `DELETE` | `/users/:id` | Delete user           |

### **Task Management**

| Method   | Endpoint     | Description            |
| -------- | ------------ | ---------------------- |
| `GET`    | `/tasks`     | Get tasks with filters |
| `POST`   | `/tasks`     | Create new task        |
| `GET`    | `/tasks/:id` | Get task by ID         |
| `PUT`    | `/tasks/:id` | Update task            |
| `DELETE` | `/tasks/:id` | Delete task            |

### **Application System**

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| `POST` | `/tasks/:id/applications`   | Apply for task        |
| `GET`  | `/tasks/:id/applications`   | Get task applications |
| `PUT`  | `/applications/:id`         | Update application    |
| `POST` | `/applications/:id/approve` | Approve application   |

### **Response Format**

**Success Response:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "statusCode": 200,
  "timestamp": "2025-09-07T10:30:00.000Z",
  "data": {
    // Response data
  },
  "meta": {
    // Pagination info (if applicable)
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "timestamp": "2025-09-07T10:30:00.000Z",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": "Input validation failed",
    "errorSources": [
      {
        "path": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

## 📁 Project Structure

```
src/
├── 📁 config/          # Configuration files
│   ├── database.ts     # Database connection
│   └── index.ts        # App configuration
├── 📁 interface/       # TypeScript interfaces
│   └── global.interface.ts
├── 📁 middlewares/     # Express middlewares
│   ├── auth.middleware.ts
│   ├── errorHandler.ts
│   └── validateRequest.ts
├── 📁 modules/         # Feature modules
│   ├── 📁 auth/        # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.interface.ts
│   │   └── auth.routes.ts
│   ├── 📁 user/        # User management module
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.validator.ts
│   │   └── user.routes.ts
│   └── 📁 task/        # Task management module
│       ├── task.controller.ts
│       ├── task.service.ts
│       ├── task.validator.ts
│       └── task.routes.ts
├── 📁 types/          # Global type definitions
│   └── global.d.ts
├── 📁 utils/          # Utility functions
│   ├── sendResponse.ts
│   ├── asyncHandler.ts
│   ├── createToken.ts
│   └── index.ts
├── 📄 app.ts          # Express app setup
└── 📄 server.ts       # Server entry point

prisma/
├── 📁 migrations/     # Database migrations
├── 📄 schema.prisma   # Database schema
└── 📄 seed.ts         # Database seeding

docs/
├── 📄 api.md          # API documentation
├── 📄 deployment.md   # Deployment guide
└── 📄 contributing.md # Contribution guidelines
```

### **Module Structure**

Each feature module follows a consistent structure:

- **Controller** - HTTP request/response handling
- **Service** - Business logic and data operations
- **Validator** - Input validation schemas (Zod)
- **Interface** - TypeScript type definitions
- **Routes** - Express route definitions

## 💻 Development

### **Available Scripts**

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database (dev only)
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage
```

### **Development Workflow**

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes**

   - Follow the established module structure
   - Add proper TypeScript types
   - Include input validation
   - Write tests for new functionality

3. **Database Changes**

   ```bash
   # Create migration
   npx prisma migrate dev --name add_new_feature

   # Update Prisma client
   npx prisma generate
   ```

4. **Test Changes**

   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

### **Code Style Guidelines**

- **TypeScript**: Use strict type checking
- **Naming**: Use camelCase for variables, PascalCase for types
- **Imports**: Use absolute imports from `src/`
- **Error Handling**: Use the custom `AppError` class
- **Validation**: Use Zod schemas for input validation
- **Database**: Use Prisma best practices

## 🧪 Testing

### **Testing Strategy**

- **Unit Tests** - Individual functions and methods
- **Integration Tests** - API endpoints and database operations
- **E2E Tests** - Complete user workflows

### **Testing Tools**

- **Jest** - Testing framework
- **Supertest** - HTTP assertion library
- **@prisma/client** - Database testing utilities

### **Running Tests**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.ts
```

### **Test Structure**

```
tests/
├── 📁 unit/           # Unit tests
│   ├── auth.test.ts
│   └── user.test.ts
├── 📁 integration/    # Integration tests
│   ├── auth.api.test.ts
│   └── user.api.test.ts
├── 📁 e2e/           # End-to-end tests
│   └── user-flow.test.ts
└── 📁 fixtures/      # Test data and utilities
    ├── database.ts
    └── testData.ts
```

## 🚀 Deployment

### **Production Environment**

**Environment Variables for Production:**

```bash
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_ACCESS_SECRET=secure_random_string
JWT_REFRESH_SECRET=another_secure_random_string
```

### **Docker Deployment**

1. **Build Docker Image**

   ```bash
   docker build -t get-it-done-backend .
   ```

2. **Run with Docker Compose**

   ```yaml
   version: "3.8"
   services:
     app:
       build: .
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://user:pass@db:5432/getitdone
       depends_on:
         - db

     db:
       image: postgres:15
       environment:
         POSTGRES_DB: getitdone
         POSTGRES_USER: user
         POSTGRES_PASSWORD: pass
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

### **Cloud Deployment Options**

#### **Heroku**

```bash
# Install Heroku CLI and login
heroku create get-it-done-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
```

#### **Railway**

```bash
# Install Railway CLI
railway login
railway init
railway add postgresql
railway deploy
```

#### **DigitalOcean App Platform**

```yaml
name: get-it-done-backend
services:
  - name: api
    source_dir: /
    github:
      repo: RanokRaihan/get-it-done-backend
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
databases:
  - name: db
    engine: PG
    version: "15"
```

### **Production Checklist**

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error tracking configured

## 🤝 Contributing

We welcome contributions to the Get It Done backend! Please follow these guidelines:

### **Getting Started**

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/get-it-done-backend.git
   ```
3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

### **Development Process**

1. **Follow coding standards**

   - Use TypeScript with strict type checking
   - Follow the established project structure
   - Add proper error handling
   - Include input validation

2. **Write tests**

   - Unit tests for business logic
   - Integration tests for API endpoints
   - Maintain test coverage above 80%

3. **Update documentation**
   - Update README if needed
   - Add JSDoc comments for functions
   - Update API documentation

### **Pull Request Process**

1. **Ensure CI passes**

   - All tests pass
   - Code passes linting
   - TypeScript compiles without errors

2. **Provide clear description**

   - Explain what changes were made
   - Include screenshots if UI changes
   - Reference related issues

3. **Request review**
   - Tag relevant maintainers
   - Respond to feedback promptly

### **Code Review Guidelines**

- **Functionality** - Does the code work as intended?
- **Code Quality** - Is the code clean and maintainable?
- **Performance** - Are there any performance concerns?
- **Security** - Are there any security vulnerabilities?
- **Testing** - Are there adequate tests?

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: [Ranok Raihan](https://github.com/RanokRaihan)
- **Project Repository**: [get-it-done-backend](https://github.com/RanokRaihan/get-it-done-backend)

## 🙏 Acknowledgments

- **Express.js** community for the excellent web framework
- **Prisma** team for the amazing ORM and database tools
- **TypeScript** team for bringing type safety to JavaScript
- **Zod** for runtime type validation
- All contributors and testers who helped improve this project

## 📞 Support

If you have any questions or need help with the project:

- **Create an Issue**: [GitHub Issues](https://github.com/RanokRaihan/get-it-done-backend/issues)
- **Discussion**: [GitHub Discussions](https://github.com/RanokRaihan/get-it-done-backend/discussions)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

**Made with ❤️ by the Get It Done team**
