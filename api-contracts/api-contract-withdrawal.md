# API Contract — Withdrawal (`/api/v1/withdrawal`)

---

## Enums

### `WithdrawalStatus`

```ts
type WithdrawalStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "CANCELLED";
```

Default: `"PENDING"`.

### `WithdrawalMethodType`

```ts
type WithdrawalMethodType = "BANK" | "MOBILE_BANKING";
```

---

## Shared Types

### `WithdrawalMethod`

```ts
interface WithdrawalMethod {
  id: string;
  walletId: string;
  methodType: WithdrawalMethodType;
  accountNumber: string;
  accountName: string;
  bankName: string | null;
  branchName: string | null;
  routingNumber: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### `WithdrawalRequest`

```ts
interface WithdrawalRequest {
  id: string;
  walletId: string;
  withdrawalMethodId: string;
  amount: string; // Decimal as string
  status: WithdrawalStatus;
  note: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  refWalletTnxId: string | null;
  processedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Endpoint Table

| Method | Path                            | Auth | Roles | Description                          |
| ------ | ------------------------------- | ---- | ----- | ------------------------------------ |
| POST   | `/my-methods`                   | JWT  | USER  | Create a withdrawal method           |
| GET    | `/my-methods`                   | JWT  | USER  | List active withdrawal methods       |
| GET    | `/my-methods/:id`               | JWT  | USER  | Get withdrawal method by ID          |
| PATCH  | `/my-methods/:id/set-default`   | JWT  | USER  | Set a method as the default          |
| PATCH  | `/my-methods/:id`               | JWT  | USER  | Update withdrawal method fields      |
| DELETE | `/my-methods/:id`               | JWT  | USER  | Soft-delete withdrawal method        |
| POST   | `/my-requests`                  | JWT  | USER  | Create withdrawal request            |
| GET    | `/my-requests`                  | JWT  | USER  | List own withdrawal requests         |
| GET    | `/my-requests/:id`              | JWT  | USER  | Get withdrawal request by ID         |
| PATCH  | `/my-requests/:id`              | JWT  | USER  | Edit a PENDING withdrawal request    |
| PATCH  | `/my-requests/:id/cancel`       | JWT  | USER  | Cancel a PENDING withdrawal request  |

---

## WithdrawalMethod Endpoints

### `POST /my-methods`

**Request body:**

```ts
{
  methodType: WithdrawalMethodType;    // required
  accountNumber: string;               // required, max 50 chars
  accountName: string;                 // required, max 100 chars
  bankName?: string;                   // required when methodType === "BANK"; max 100 chars
  branchName?: string;                 // optional, max 100 chars
  routingNumber?: string;              // optional, max 50 chars
  isDefault?: boolean;                 // default false; sets this as the default method
}
```

**Response `data`:** Full `WithdrawalMethod` object (201 Created).

**Side effects:** If `isDefault: true`, any existing default method for the wallet is unset first.

**Errors:**
- `400` — `bankName` missing when `methodType === "BANK"`
- `404` — Wallet not found

---

### `GET /my-methods`

Returns only `isActive: true` methods. Supports pagination (`page`, `limit`), sorting (`sortBy`: `createdAt` | `updatedAt`, `sortOrder`), and filtering (`methodType`).

**Response `data`:**

```ts
{
  data: WithdrawalMethod[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; };
}
```

---

### `GET /my-methods/:id`

Only returns active (non-deleted) methods.

**Response `data`:** Full `WithdrawalMethod` object.

**Errors:**
- `403` — Method does not belong to the authenticated user
- `404` — Method not found (or method is inactive)

---

### `PATCH /my-methods/:id/set-default`

No request body. Atomically unsets all existing defaults for the wallet and sets this method as default.

**Response `data`:** Updated `WithdrawalMethod`.

**Errors:**
- `400` — Method is inactive (deleted)
- `403` — Method does not belong to the authenticated user
- `404` — Method not found

---

### `PATCH /my-methods/:id`

**Request body:** (at least one field required)

```ts
{
  methodType?: WithdrawalMethodType;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
}
```

**Response `data`:** Updated `WithdrawalMethod`.

**Errors:**
- `400` — No fields provided, or method is inactive
- `403` — Not authorized
- `404` — Method not found

---

### `DELETE /my-methods/:id`

No request body. Soft-deletes the method (`isActive: false, isDefault: false`).

**Response `data`:** Updated `WithdrawalMethod` with `isActive: false`.

**Errors:**
- `400` — Method has one or more PENDING withdrawal requests
- `403` — Not authorized
- `404` — Method not found

---

## WithdrawalRequest Endpoints

### `POST /my-requests`

**Request body:**

```ts
{
  withdrawalMethodId: string; // must belong to authenticated user's wallet and be active
  amount: number;             // positive, minimum 10
  note?: string;              // optional, max 500 chars
}
```

**Response `data`:** Full `WithdrawalRequest` including nested `withdrawalMethod` (201 Created).

**Side effects:**
- Wallet balance decremented by `amount`
- `WalletTransaction` created (type: `DEBIT`, category: `WITHDRAWAL`, status: `PENDING`)
- `refWalletTnxId` on the request points to the created `WalletTransaction.id`

**Errors:**
- `400` — `amount` > wallet balance ("Insufficient wallet balance for this withdrawal")
- `404` — Wallet not found, or withdrawal method not found / inactive

---

### `GET /my-requests`

Supports pagination (`page`, `limit`), sorting (`sortBy`: `amount` | `createdAt` | `updatedAt`, `sortOrder`), and filtering (`status`).

**Response `data`:**

```ts
{
  data: Array<WithdrawalRequest & { withdrawalMethod: WithdrawalMethod }>;
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; };
}
```

---

### `GET /my-requests/:id`

**Response `data`:** Full `WithdrawalRequest` including nested `withdrawalMethod`.

**Errors:**
- `403` — Request does not belong to the authenticated user
- `404` — Request not found

---

### `PATCH /my-requests/:id`

Only allowed when `status === "PENDING"`. At least one of `amount` or `note` must be provided.

**Request body:**

```ts
{
  amount?: number; // positive, minimum 10
  note?: string;   // max 500 chars
}
```

**Response `data`:** Updated `WithdrawalRequest` including nested `withdrawalMethod`.

**Side effects (when `amount` changes):**
- Wallet balance adjusted by the difference (`new - old`); net debit or credit depending on direction
- Linked `WalletTransaction.amount` and `balanceAfter` updated accordingly
- Available check: `newAmount ≤ (currentWalletBalance + currentRequestAmount)`

**Errors:**
- `400` — No fields provided; `status !== PENDING`; new amount exceeds available balance
- `403` — Not authorized
- `404` — Request not found

---

### `PATCH /my-requests/:id/cancel`

Only allowed when `status === "PENDING"`.

**Request body:**

```ts
{
  cancellationReason?: string; // optional, 1–500 chars
}
```

**Response `data`:** Updated `WithdrawalRequest` with `status: "CANCELLED"` and nested `withdrawalMethod`.

**Side effects:**
- Wallet balance credited back by `request.amount`
- Linked `WalletTransaction.status` set to `"CANCELLED"`
- `WithdrawalRequest.cancelledAt` set to current timestamp

**Errors:**
- `400` — `status !== PENDING`
- `403` — Not authorized
- `404` — Request not found

---

## Route Protection Map

```ts
// All withdrawal routes require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "POST   /api/v1/withdrawal/my-methods":                  { roles: ["USER"] },
  "GET    /api/v1/withdrawal/my-methods":                  { roles: ["USER"] },
  "GET    /api/v1/withdrawal/my-methods/:id":              { roles: ["USER"] },
  "PATCH  /api/v1/withdrawal/my-methods/:id/set-default":  { roles: ["USER"] },
  "PATCH  /api/v1/withdrawal/my-methods/:id":              { roles: ["USER"] },
  "DELETE /api/v1/withdrawal/my-methods/:id":              { roles: ["USER"] },
  "POST   /api/v1/withdrawal/my-requests":                 { roles: ["USER"] },
  "GET    /api/v1/withdrawal/my-requests":                 { roles: ["USER"] },
  "GET    /api/v1/withdrawal/my-requests/:id":             { roles: ["USER"] },
  "PATCH  /api/v1/withdrawal/my-requests/:id":             { roles: ["USER"] },
  "PATCH  /api/v1/withdrawal/my-requests/:id/cancel":      { roles: ["USER"] },
};
```

---

## Known Gotchas

### Route ordering

`PATCH /my-methods/:id/set-default` is registered **before** `PATCH /my-methods/:id` to prevent Express from matching `set-default` as the `:id` parameter. Same applies to `PATCH /my-requests/:id/cancel` vs `PATCH /my-requests/:id`.

### Funds reserved on request creation

When a `WithdrawalRequest` is created, the `amount` is immediately deducted from the wallet balance and a `PENDING` `WalletTransaction` is created. The balance is restored automatically on cancellation. Admin approval/rejection (future) would complete or reverse the `WalletTransaction` accordingly.

### `isDefault` atomicity

`set-default` unsets all existing defaults for the wallet and sets the target method as default inside a Prisma `$transaction`. The general update endpoint (`PATCH /my-methods/:id`) does not accept `isDefault` — use the dedicated `set-default` endpoint instead.

### Soft-delete on `WithdrawalMethod`

Deleted methods (`isActive: false`) are excluded from `GET /my-methods` list results but remain in the database and can still be referenced by historical `WithdrawalRequest` records.
