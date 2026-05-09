# Security & Quality Audit — Withdrawal Module — 2026-05-09

Scope: `src/modules/withdrawal/` only (all 6 files).  
Files read: `withdrawal.route.ts`, `withdrawal.controller.ts`, `withdrawal.service.ts`, `withdrawal.validator.ts`, `withdrawal.interface.ts`, `withdrawal.constant.ts`

**Resolution status (2026-05-09):** All HIGH and MEDIUM findings fixed. L-02 through L-07 fixed. L-01, I-01, I-02 deferred (out of scope for this pass). I-03 and L-07 were already fixed prior to this audit.

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| High     | 3     | 3     |
| Medium   | 4     | 4     |
| Low      | 7     | 5 (L-02–L-06); L-01 deferred; L-07 pre-fixed |
| Info     | 3     | 1 (I-03 pre-fixed); I-01, I-02 deferred |

---

## HIGH

### H-01 — TOCTOU Race Condition in `createWithdrawalRequestService` ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:229, 232–264`

The balance sufficiency check runs outside the `$transaction`, then the debit happens inside it. Under concurrent requests, two callers can both pass the check against the same stale balance and both have their debits applied, driving the wallet balance negative.

Additionally, `balanceBefore: user.wallet!.balance` (line 248) records the balance read before the transaction — if another concurrent write lands between the outer read and the inner decrement, the ledger entry records a wrong `balanceBefore`.

```ts
// outside transaction — stale by the time decrement runs
if (Number(user.wallet.balance) < payload.amount)
  throw new AppError(400, "Insufficient wallet balance for this withdrawal");

const result = await prisma.$transaction(async (tx) => {
  const updatedWallet = await tx.wallet.update({ data: { balance: { decrement: payload.amount } } });
  // balanceBefore is from the outer read, not from inside the tx
  balanceBefore: user.wallet!.balance,   // ← stale
  ...
});
```

**Fix:** Re-read the wallet inside the transaction and perform the balance check there. Use `tx.wallet.findUniqueOrThrow` at the top of the `$transaction` block to get an accurate `balanceBefore` and perform the sufficiency check atomically.

---

### H-02 — Wallet Object Leaked in GET-by-ID Responses ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:84–95, 305–317`

`getWithdrawalMethodByIdService` and `getWithdrawalRequestByIdService` both include the full `wallet` relation for the ownership check and return the Prisma result directly. The wallet object — including `balance`, `userId`, and internal IDs — is sent to the client.

```ts
// getWithdrawalMethodByIdService
const method = await prisma.withdrawalMethod.findUnique({
  where: { id },
  include: { wallet: true },  // wallet returned to caller
});
return method;  // wallet.balance, wallet.userId exposed

// getWithdrawalRequestByIdService
const request = await prisma.withdrawalRequest.findUnique({
  where: { id },
  include: { wallet: true, withdrawalMethod: true },  // wallet returned
});
return request;
```

**Fix:** After the ownership check, re-query without `wallet` in the include (or use `omit`/`select` to strip it from the returned shape). Alternatively, destructure and drop the `wallet` key before returning.

---

### H-03 — `getWithdrawalMethodByIdService` Returns Soft-Deleted Methods ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:84–95`

The `findUnique` has no `isActive` filter. A user who knows the ID of a previously deleted withdrawal method can retrieve its full record. The list endpoint (`getMyWithdrawalMethodsService`) correctly enforces `isActive: true`; the by-ID endpoint does not, creating an inconsistency and information disclosure.

```ts
const method = await prisma.withdrawalMethod.findUnique({
  where: { id },          // no isActive: true guard
  include: { wallet: true },
});
```

**Fix:** Change the `where` to `{ id, isActive: true }`. This naturally returns `null` for deleted methods, which the existing 404 check will handle correctly.

---

## MEDIUM

### M-01 — Default-Unset + Create Not Atomic in `createWithdrawalMethodService` ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:30–48`

When `isDefault: true` is passed on creation, two separate Prisma calls are made — an `updateMany` to clear existing defaults and a `create`. These are not wrapped in a `$transaction`. Under concurrent requests, both could unset defaults simultaneously and create two default methods.

```ts
// not in a transaction
await prisma.withdrawalMethod.updateMany({ where: { ..., isDefault: true }, data: { isDefault: false } });
const method = await prisma.withdrawalMethod.create({ data: { ..., isDefault: true } });
```

**Fix:** Wrap both operations in a single `prisma.$transaction`. Mirror the pattern in `setDefaultWithdrawalMethodService` which already does this correctly.

---

### M-02 — Default-Unset + Update Not Atomic in `updateWithdrawalMethodService` ✅ FIXED (via L-04)
**File:** `src/modules/withdrawal/withdrawal.service.ts:114–142`

Same problem as M-01: when `payload.isDefault === true`, the `updateMany` to clear other defaults and the `update` on the target method are separate calls outside a transaction.

```ts
if (payload.isDefault) {
  await prisma.withdrawalMethod.updateMany(...);  // not in a tx
}
const updated = await prisma.withdrawalMethod.update(...);  // not in a tx
```

**Fix:** Wrap both in `prisma.$transaction`.

---

### M-03 — Pending-Check + Soft-Delete Not Atomic in `deleteWithdrawalMethodService` ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:191–204`

The check for pending withdrawal requests and the soft-delete are two separate operations. A withdrawal request could be created against this method in the gap between the count check and the `update` to `isActive: false`, violating the invariant that a method with pending requests cannot be deleted.

```ts
const pendingCount = await prisma.withdrawalRequest.count({ where: { withdrawalMethodId: id, status: "PENDING" } });
if (pendingCount > 0) throw ...;
// ← concurrent request can be created here
const updated = await prisma.withdrawalMethod.update({ data: { isActive: false, isDefault: false } });
```

**Fix:** Wrap both in `prisma.$transaction`.

---

### M-04 — TOCTOU Race Condition in `editWithdrawalRequestService` ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:337–377`

Same category as H-01. The available-balance check is performed outside the transaction:

```ts
const available = Number(request.wallet.balance) + Number(request.amount);
if (payload.amount > available)
  throw new AppError(400, "Insufficient wallet balance for the updated amount");

const updated = await prisma.$transaction(async (tx) => {
  const updatedWallet = await tx.wallet.update({ data: { balance: { decrement: diff } } });
  ...
});
```

Under concurrent edits or a concurrent withdrawal request, the balance seen in `request.wallet.balance` (from the outer `findUnique`) may already be stale when the transaction runs.

**Fix:** Perform the balance check inside the `$transaction` using a fresh wallet read.

---

## LOW

### L-01 — All Controllers Use Deprecated `sendResponse()` Instead of `ResponseHandler` ⏭ DEFERRED
**File:** `src/modules/withdrawal/withdrawal.controller.ts` (all 11 controllers)

Every controller calls `sendResponse(res, statusCode, message, data)`, which is the legacy utility. `CLAUDE.md` explicitly prohibits this and requires `ResponseHandler` static methods (`ResponseHandler.ok`, `ResponseHandler.created`, etc.).

**Fix:** Replace all `sendResponse` calls. Examples:
```ts
// before
sendResponse(res, 201, "Withdrawal method created successfully", method);
sendResponse(res, 200, "Withdrawal methods fetched successfully", result);

// after
ResponseHandler.created(res, "Withdrawal method created successfully", method, { path: req.path });
ResponseHandler.ok(res, "Withdrawal methods fetched successfully", result, { path: req.path });
```
Also update the import to use `ResponseHandler` from `../../utils` instead of `sendResponse`.

---

### L-02 — `isActive` Exposed as Filterable Field but Silently Overridden ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.constant.ts:2`

`withdrawalMethodFilterableFields = ["methodType", "isActive"]` exposes `isActive` as a query filter. However, `getMyWithdrawalMethodsService` hardcodes `isActive: true` in the merged `where` last, so any client-supplied `isActive` value is always overridden. The filter has no effect and gives a false impression of control.

**Fix:** Remove `"isActive"` from `withdrawalMethodFilterableFields`.

---

### L-03 — `WithdrawalMethodType` Manually Redefined Instead of Using Prisma Enum ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.interface.ts:1`

```ts
type WithdrawalMethodType = "BANK" | "MOBILE_BANKING";
```

`CLAUDE.md` requires using Prisma-generated types. The Prisma client exports `WithdrawalMethodType` from `@prisma/client`.

**Fix:** Remove the manual definition and import `WithdrawalMethodType` from `@prisma/client` wherever it is needed.

---

### L-04 — `isDefault` Settable via General Update Endpoint Bypasses Safe Path ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.validator.ts:37`, `withdrawal.service.ts:114–142`

The `updateWithdrawalMethodSchema` allows `isDefault: boolean`. Setting `isDefault: true` via `PATCH /my-methods/:id` uses non-atomic logic (M-02), while the dedicated `PATCH /my-methods/:id/set-default` endpoint is fully atomic. Having two paths for the same state transition, with different safety properties, is a code quality and correctness risk.

**Fix:** Remove `isDefault` from `updateWithdrawalMethodSchema` (and `IUpdateWithdrawalMethodPayload`). All default-setting should go through the dedicated endpoint.

---

### L-05 — `cancellationReason` Accepts Empty String ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.validator.ts:95`

```ts
cancellationReason: z.string().max(500).optional()
```

An empty string `""` passes validation. If present, a reason string should contain actual content.

**Fix:** Change to `z.string().min(1).max(500).optional()`.

---

### L-06 — Financial String Fields Lack `.trim()` and Format Normalization ✅ FIXED
**File:** `src/modules/withdrawal/withdrawal.validator.ts:6–10`

`accountNumber`, `accountName`, `bankName`, `branchName`, and `routingNumber` accept any string including leading/trailing whitespace. Storing untrimmed financial identifiers causes silent mismatches (e.g., `"123456"` vs `" 123456"`).

**Fix:** Add `.trim()` to each of these fields:
```ts
accountNumber: z.string().min(1).max(50).trim(),
accountName: z.string().min(1).max(100).trim(),
bankName: z.string().max(100).trim().optional(),
branchName: z.string().max(100).trim().optional(),
routingNumber: z.string().max(50).trim().optional(),
```

---

### L-07 — `deleteWithdrawalMethodService` Silently Succeeds on Already-Deleted Methods ✅ PRE-FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:180–204`

The initial `findUnique` has no `isActive` filter. If a method is already inactive, the service still finds it, passes all checks, runs the no-op `update`, and returns 200. The caller gets a success response for deleting something that was already deleted. The update endpoint (`updateWithdrawalMethodService`) correctly uses `{ id, isActive: true }` in its lookup.

**Fix:** Change the `findUnique` to `{ where: { id, isActive: true } }` so that already-deleted methods return a 404.

---

## INFO

### I-01 — No Rate Limiting on `POST /my-requests` ⏭ DEFERRED
**File:** `src/modules/withdrawal/withdrawal.route.ts:77–83`

The withdrawal request creation endpoint has no rate limiter. While the balance check prevents actual over-withdrawal, a user could spam the endpoint causing repeated DB reads and writes (user lookup, wallet read, method lookup, balance check). Other sensitive endpoints (login, refresh, email verification) have rate limiters.

**Recommendation:** Add an `express-rate-limit` middleware on `POST /my-requests` — e.g., 10 requests per 15 minutes per IP.

---

### I-02 — List Endpoints Lack Query Validation Schemas ⏭ DEFERRED
**File:** `src/modules/withdrawal/withdrawal.route.ts:40–45, 84–89`

`GET /my-methods` and `GET /my-requests` have no `validateRequest` middleware for query params (`sort`, `filter`, `page`, `limit`). The `buildPrismaQuery` utility guards against unknown sort/filter fields, but there is no validation for out-of-range or malformed `page`/`limit` values at the route layer. Other modules (task, wallet) define `getAllX` schemas for this purpose.

**Recommendation:** Add query validation schemas (`getMyWithdrawalMethodsSchema`, `getMyWithdrawalRequestsSchema`) and wire them into the routes.

---

### I-03 — No Cap on Withdrawal Methods Per Wallet ✅ PRE-FIXED
**File:** `src/modules/withdrawal/withdrawal.service.ts:20–50`

There is no upper bound on how many withdrawal methods a user can create. Unlimited creates are allowed. This is a minor DoS vector and a data hygiene concern.

**Recommendation:** Add a count check before creating a new method and throw a 400 if the wallet already has (e.g.) 10 active methods.
