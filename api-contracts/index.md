# API Contracts — Index

The Get It Done API is a REST API served under the base path `/api/v1` (e.g. `http://localhost:5000/api/v1` in development). There is a single API version (v1); no versioning negotiation is required. Authentication uses short-lived JWT access tokens sent as `Authorization: Bearer <token>` and long-lived refresh tokens delivered as both an httpOnly cookie and a response body field; all token issuance and refresh logic lives in the auth module. Cross-cutting concerns — response envelope shapes, error type strings, and base pagination parameters — are documented in `shared.md`.

---

| Module      | File                          | What's covered                                                                                    |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Shared      | `shared.md`                   | Success/error envelope shapes, both error response formats, error type table, base pagination params, cross-module gotchas (Decimal strings, CORS) |
| Auth        | `api-contract-auth.md`        | Token issuance, cookie delivery, JWT payload, refresh flow, 401 semantics, `UserRole`, `UserProfileStatus` enums, all 11 `/auth` endpoints |
| User        | `api-contract-user.md`        | Registration, profile CRUD, public profiles with stats/reviews, `Gender` and `Provider` enums, `UserPublic`/`UserProfile` types |
| Task        | `api-contract-task.md`        | Task CRUD, image management, status transitions, `TaskStatus`/`TaskPriority`/`TaskCategory` enums, `TaskPublic`/`TaskOwner`/`Image` types, task status machine, task-specific filter params |
| Application | `api-contract-application.md` | Apply, approve, reject, withdraw flows, `ApplicationStatus` enum, route ordering warning          |
| Payment     | `api-contract-payment.md`     | Cash and online (SSLCommerz) payment flows, IPN webhook, `PaymentMethod`/`PaymentStatus`/`CashStatus`/`PaymentType` enums, `Payment` type |
| Wallet      | `api-contract-wallet.md`      | Wallet balance, transaction ledger, commission due tracking and payment, wallet enums and types    |
