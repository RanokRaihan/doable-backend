# API Contract — Wallet (`/api/v1/wallet`)

---

## Enums

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

## Shared Types

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

## Endpoints

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

## Route Protection Map

```ts
// All wallet routes are protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "GET  /api/v1/wallet/my-wallet":                  { roles: ["USER"] },
  "GET  /api/v1/wallet/wallet-transactions":         { roles: ["USER"] },
  "GET  /api/v1/wallet/wallet-transaction/:tnxId":   { roles: ["USER"] },
  "GET  /api/v1/wallet/commission-due":              { roles: ["USER"] },
  "GET  /api/v1/wallet/commission-due/:dueId":       { roles: ["USER"] },
  "PATCH /api/v1/wallet/commission-due/pay/:dueId":  { roles: ["USER"] },
};
```

---

## Known Mismatches & Gotchas

### `wallet-transaction/:tnxId` uses DB record ID, not transactionId

The `:tnxId` parameter on `GET /wallet-transaction/:tnxId` is the **Prisma record ID** (cuid), not the `transactionId` string (e.g. `"WTNX-..."`).
