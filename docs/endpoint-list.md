# Get It Done - API Endpoints Documentation

**Version:** 1.0  
**Date:** November 29, 2025  
**Project:** Get It Done Backend

---

## Table of Contents

1. [Authentication Module](#authentication-module)
2. [User Module](#user-module)
3. [Task Module](#task-module)
4. [Application Module](#application-module)
5. [Payment Module](#payment-module)
6. [Wallet Module](#wallet-module)
7. [Review Module](#review-module)
8. [Message Module](#message-module)
9. [Notification Module](#notification-module)
10. [Admin Module](#admin-module)
11. [Demo/Test Module](#demotest-module)

---

## 🔐 Authentication Module

| Method | Endpoint                       | Description                               |
| ------ | ------------------------------ | ----------------------------------------- |
| POST   | `/api/v1/auth/register`        | User registration with email and password |
| POST   | `/api/v1/auth/login`           | User login and JWT token generation       |
| POST   | `/api/v1/auth/logout`          | User logout and token invalidation        |
| POST   | `/api/v1/auth/refresh-token`   | Refresh access token using refresh token  |
| POST   | `/api/v1/auth/change-password` | Change user password (authenticated)      |

**Total Endpoints:** 5

---

## 👤 User Module

| Method | Endpoint                | Description                            |
| ------ | ----------------------- | -------------------------------------- |
| GET    | `/api/v1/users/profile` | Get current authenticated user profile |
| PATCH  | `/api/v1/users/profile` | Update user profile information        |
| GET    | `/api/v1/users/:id`     | Get public user profile by ID          |

**Total Endpoints:** 3

---

## 📝 Task Module

| Method | Endpoint            | Description                                 |
| ------ | ------------------- | ------------------------------------------- |
| POST   | `/api/v1/tasks`     | Create a new task                           |
| GET    | `/api/v1/tasks`     | Get all tasks with filtering and pagination |
| GET    | `/api/v1/tasks/:id` | Get single task details                     |
| PATCH  | `/api/v1/tasks/:id` | Update task information                     |
| DELETE | `/api/v1/tasks/:id` | Soft delete a task                          |

**Total Endpoints:** 5

**Query Parameters for GET /api/v1/tasks:**

- `status` - Filter by task status
- `category` - Filter by category
- `location` - Filter by location
- `search` - Search in title/description
- `minBudget` - Minimum budget filter
- `maxBudget` - Maximum budget filter
- `page` - Page number for pagination
- `limit` - Items per page

---

## 📋 Application Module

| Method | Endpoint                             | Description                                  |
| ------ | ------------------------------------ | -------------------------------------------- |
| POST   | `/api/v1/tasks/:taskId/applications` | Apply for a specific task                    |
| GET    | `/api/v1/tasks/:taskId/applications` | Get all applications for a task (owner only) |
| GET    | `/api/v1/applications`               | Get current user's applications              |
| GET    | `/api/v1/applications/:id`           | Get single application details               |
| PATCH  | `/api/v1/applications/:id`           | Update application information               |
| POST   | `/api/v1/applications/:id/accept`    | Accept an application (task owner only)      |
| POST   | `/api/v1/applications/:id/reject`    | Reject an application (task owner only)      |
| DELETE | `/api/v1/applications/:id`           | Withdraw application (applicant only)        |

**Total Endpoints:** 8

---

## 💳 Payment Module

| Method | Endpoint                                   | Description                           |
| ------ | ------------------------------------------ | ------------------------------------- |
| POST   | `/api/v1/payments/online/initiate/:taskId` | Initiate online payment for task      |
| POST   | `/api/v1/payments/cash/initiate/:taskId`   | Initiate cash payment for task        |
| PATCH  | `/api/v1/payments/cash/confirm/:paymentId` | Confirm cash payment received (payee) |
| PATCH  | `/api/v1/payments/cash/decline/:paymentId` | Decline cash payment (payee)          |
| GET    | `/api/v1/payments/:id`                     | Get payment details by ID             |
| GET    | `/api/v1/payments/task/:taskId`            | Get all payments for a task           |
| GET    | `/api/v1/payments/user`                    | Get current user's payment history    |

**Total Endpoints:** 7

**Payment Methods:**

- Online (Credit/Debit Card, Digital Wallets)
- Cash (In-person payment)

---

## 💰 Wallet Module

| Method | Endpoint                             | Description                    |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/api/v1/wallet`                     | Get current wallet balance     |
| GET    | `/api/v1/wallet/transactions`        | Get wallet transaction history |
| GET    | `/api/v1/wallet/transactions/:id`    | Get single transaction details |
| POST   | `/api/v1/wallet/withdraw`            | Withdraw funds from wallet     |
| GET    | `/api/v1/wallet/commissions`         | Get commission dues            |
| POST   | `/api/v1/wallet/commissions/:id/pay` | Pay outstanding commission     |

**Total Endpoints:** 6

---

## ⭐ Review Module

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| POST   | `/api/v1/reviews`               | Create a review for completed task |
| GET    | `/api/v1/reviews/:id`           | Get single review details          |
| PATCH  | `/api/v1/reviews/:id`           | Update review (author only)        |
| DELETE | `/api/v1/reviews/:id`           | Delete review (author only)        |
| GET    | `/api/v1/tasks/:taskId/reviews` | Get all reviews for a task         |
| GET    | `/api/v1/users/:userId/reviews` | Get all reviews for a user         |

**Total Endpoints:** 6

---

## 💬 Message Module

| Method | Endpoint                                | Description                         |
| ------ | --------------------------------------- | ----------------------------------- |
| POST   | `/api/v1/messages`                      | Send a new message                  |
| GET    | `/api/v1/messages`                      | Get current user's messages         |
| GET    | `/api/v1/messages/:id`                  | Get single message details          |
| PATCH  | `/api/v1/messages/:id/read`             | Mark message as read                |
| GET    | `/api/v1/messages/conversation/:userId` | Get conversation with specific user |
| GET    | `/api/v1/messages/task/:taskId`         | Get all messages related to task    |

**Total Endpoints:** 6

---

## 🔔 Notification Module

| Method | Endpoint                         | Description                     |
| ------ | -------------------------------- | ------------------------------- |
| GET    | `/api/v1/notifications`          | Get all user notifications      |
| GET    | `/api/v1/notifications/:id`      | Get single notification details |
| PATCH  | `/api/v1/notifications/:id/read` | Mark notification as read       |
| PATCH  | `/api/v1/notifications/read-all` | Mark all notifications as read  |
| DELETE | `/api/v1/notifications/:id`      | Delete a notification           |

**Total Endpoints:** 5

---

## 👨‍💼 Admin Module

| Method | Endpoint                            | Description                       |
| ------ | ----------------------------------- | --------------------------------- |
| GET    | `/api/v1/admin/dashboard`           | Get platform dashboard statistics |
| GET    | `/api/v1/admin/users`               | Get all users with filters        |
| PATCH  | `/api/v1/admin/users/:id/suspend`   | Suspend user account              |
| PATCH  | `/api/v1/admin/users/:id/activate`  | Activate suspended user account   |
| DELETE | `/api/v1/admin/users/:id`           | Permanently delete user           |
| GET    | `/api/v1/admin/tasks`               | Get all tasks (admin view)        |
| DELETE | `/api/v1/admin/tasks/:id`           | Delete task (admin)               |
| GET    | `/api/v1/admin/payments`            | Get all payment transactions      |
| PATCH  | `/api/v1/admin/payments/:id/verify` | Verify cash payment manually      |
| GET    | `/api/v1/admin/reports`             | Get platform reports              |
| GET    | `/api/v1/admin/analytics`           | Get analytics data                |

**Total Endpoints:** 11

---

## 🧪 Demo/Test Module

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| GET    | `/api/v1/demo/success`          | Demo successful response format |
| GET    | `/api/v1/demo/created`          | Demo created response format    |
| GET    | `/api/v1/demo/paginated`        | Demo paginated response format  |
| GET    | `/api/v1/demo/not-found`        | Demo not found error response   |
| POST   | `/api/v1/demo/validation-error` | Demo validation error response  |

**Total Endpoints:** 5

---

## 📊 Summary

| Module         | Total Endpoints | Status            |
| -------------- | --------------- | ----------------- |
| Authentication | 5               | ✅ Complete       |
| User           | 3               | ✅ Complete       |
| Task           | 5               | ✅ Complete       |
| Application    | 8               | ✅ Complete       |
| Payment        | 7               | ✅ Complete       |
| Wallet         | 6               | ✅ Complete       |
| Review         | 6               | ⚠️ Partial        |
| Message        | 6               | ⚠️ Partial        |
| Notification   | 5               | ❌ Not Started    |
| Admin          | 11              | ❌ Not Started    |
| Demo/Test      | 5               | ✅ Complete       |
| **TOTAL**      | **67**          | **~65% Complete** |

---

## 📝 Notes

- All endpoints require proper authentication unless specified
- Response format follows standardized structure
- Pagination is available on list endpoints
- Soft delete is implemented for critical data
- Role-based access control is enforced

---

**Document Generated:** November 29, 2025  
**For:** Get It Done Backend Development  
**Maintained By:** Development Team
