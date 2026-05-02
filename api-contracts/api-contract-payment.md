# API Contract — Payment (`/api/v1/payment`)

---

## Enums

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

---

## Shared Types

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

---

## Endpoints

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

No request body. Task must be in `PAYMENT_PENDING` status. Poster only.

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

No request body. Task must be in `PAYMENT_PENDING`. Poster only.

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

## Route Protection Map

```ts
// Protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "POST /api/v1/payment/cash/init/:taskId":       { roles: ["USER"] },
  "PATCH /api/v1/payment/cash/confirm/:paymentId": { roles: ["USER"] },
  "PATCH /api/v1/payment/cash/decline/:paymentId": { roles: ["USER"] },
  "POST /api/v1/payment/online/init/:taskId":      { roles: ["USER"] },
  "GET  /api/v1/payment/user/payment-made":        { roles: ["USER"] },
  "GET  /api/v1/payment/user/payment-received":    { roles: ["USER"] },
  "GET  /api/v1/payment/:id":                      { roles: ["USER"] },
};

// Public — no auth required
const publicRoutes = [
  "POST /api/v1/payment/online/ipn-validate/",
];
```

---

## Known Mismatches & Gotchas

### IPN webhook uses dummy validation service

`POST /api/v1/payment/online/ipn-validate/` calls `dummyValidateOnlinePaymentService` instead of `validateOnlinePaymentService`. The dummy service **does** execute settlement (wallet credit, commission deduction, task → `COMPLETED`) but **skips the real SSLCommerz gateway validation API call** — it trusts the incoming `status` field directly without verifying against SSLCommerz. This must be replaced with the real service before production or the platform is vulnerable to forged IPN requests.

### `GET /user/payment-made` and `GET /user/payment-received` throw 404 when empty

Both endpoints throw `AppError(404, "No payments made found")` / `AppError(404, "No payments received found")` instead of returning an empty array when no records exist.
