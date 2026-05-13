# API Contract — Application (`/api/v1/application`)

---

## Enums

### `ApplicationStatus`

```ts
type ApplicationStatus = "PENDING" | "APPROVED" | "CLOSED" | "REJECTED" | "WITHDRAWN";
```

Used in: application object.

- `CLOSED` — task was closed/cancelled before this application was acted on.

---

## Endpoints

| Method | Path                       | Auth | Roles | Description                                 |
| ------ | -------------------------- | ---- | ----- | ------------------------------------------- |
| POST   | `/:taskId`                 | JWT  | USER  | Apply for a task                            |
| GET    | `/my-applications`         | JWT  | USER  | Own applications                            |
| GET    | `/task/:taskId`            | JWT  | USER  | All applications for a task (owner only)    |
| GET    | `/:applicationId`          | JWT  | USER  | Application by ID (applicant or task owner) |
| PATCH  | `/approve/:applicationId`  | JWT  | USER  | Approve application (task owner)            |
| PATCH  | `/reject/:applicationId`   | JWT  | USER  | Reject application (task owner)             |
| PATCH  | `/withdraw/:applicationId` | JWT  | USER  | Withdraw application (applicant)            |

> ⚠️ Route ordering: `GET /my-applications` and `GET /task/:taskId` are registered **before** `GET /:applicationId`. Pass a string like `my-applications` as `:applicationId` and it will match the wrong route.

---

#### `POST /:taskId`

Request:

```ts
{
  message: string; // min 10, max 5000 chars
  proposedCompensation: number; // positive
}
```

Response `data`:

```ts
{
  id: string;
  message: string;
  proposedCompensation: string; // Decimal serialized as string
  status: ApplicationStatus; // always "PENDING" on creation
  createdAt: string;
  updatedAt: string;
}
```

Constraints: task must be `OPEN`; cannot apply to own task; cannot apply twice.

---

#### `GET /my-applications`

Response `data`:

```ts
Array<{
  id: string;
  message: string;
  proposedCompensation: string; // Decimal as string
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  task: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    postedById: string;
  };
}>;
```

---

#### `GET /task/:taskId`

Task owner only.

Response `data`:

```ts
Array<{
  id: string;
  message: string;
  proposedCompensation: string;
  status: ApplicationStatus;
  withdrawalReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: { id: string; name: string };
}>;
```

---

#### `GET /:applicationId`

Accessible by applicant or task owner.

Response `data`:

```ts
{
  id: string;
  message: string;
  proposedCompensation: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  withdrawalReason: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    name: string;
  }
  task: TaskOwner; // full task object minus isDeleted/deletedAt/deletedBy/approvedApplicationId
}
```

---

#### `PATCH /approve/:applicationId`

No request body. Task owner only; task must be `OPEN`; application must be `PENDING`.

Side effects (in a transaction):

1. Application status → `APPROVED`
2. All other `PENDING` applications for this task → `REJECTED`
3. Task `status` → `ASSIGNED`, `approvedApplicationId` set, `agreedCompensation` = applicant's `proposedCompensation`

Response `data`: Updated application record (full Prisma fields).

---

#### `PATCH /reject/:applicationId`

Request:

```ts
{
  rejectionReason: string;
} // min 10, max 500 chars
```

Task owner only; application must be `PENDING`. Response `data`: Updated application record.

---

#### `PATCH /withdraw/:applicationId`

Request:

```ts
{
  withdrawalReason: string;
} // min 10, max 500 chars
```

Applicant only; application must be `PENDING`. Response `data`: `{ message: "Application withdrawn successfully" }`.

---

## Route Protection Map

```ts
// All application routes are protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "POST /api/v1/application/:taskId":                  { roles: ["USER"] },
  "GET  /api/v1/application/my-applications":          { roles: ["USER"] },
  "GET  /api/v1/application/task/:taskId":             { roles: ["USER"] },
  "GET  /api/v1/application/:applicationId":           { roles: ["USER"] },
  "PATCH /api/v1/application/approve/:applicationId":  { roles: ["USER"] },
  "PATCH /api/v1/application/reject/:applicationId":   { roles: ["USER"] },
  "PATCH /api/v1/application/withdraw/:applicationId": { roles: ["USER"] },
};
```
