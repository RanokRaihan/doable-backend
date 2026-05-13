# API Contract — Task (`/api/v1/task`)

---

## Enums

### `TaskStatus`

```ts
type TaskStatus =
  | "DRAFT"
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "PAYMENT_PENDING"
  | "PAYMENT_INITIATED"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "DISPUTED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";
```

Status machine: see Task Status Machine section below.

### `TaskPriority`

```ts
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
```

Default: `"MEDIUM"`. Used in: task creation, `GET /task/all-task` filter param.

### `TaskCategory`

```ts
type TaskCategory =
  | "DELIVERY"
  | "CLEANING"
  | "REPAIR"
  | "TUTORING"
  | "GARDENING"
  | "MOVING"
  | "PET_CARE"
  | "TECH_SUPPORT"
  | "OTHER";
```

Used in: task creation, `GET /task/all-task` filter param.

---

## Query Filter Parameters

Additional filter params for `GET /api/v1/task/all-task` (on top of the base pagination params in `shared.md`):

| Param      | Type           | Allowed values                |
| ---------- | -------------- | ----------------------------- |
| `status`   | `TaskStatus`   | Any `TaskStatus` enum value   |
| `category` | `TaskCategory` | Any `TaskCategory` enum value |
| `priority` | `TaskPriority` | Any `TaskPriority` enum value |

Sortable fields: `createdAt`, `updatedAt`, `title`.
Search fields: `title`, `description`, `location`.
`maxLimit` = 50, `defaultLimit` = 10.

---

## Shared Types

### `TaskPublic` (returned by `GET /task/all-task`, `GET /task/:id`)

```ts
interface TaskPublic {
  id: string;
  title: string; // max 200 chars
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  postedById: string;
  status: TaskStatus;
  location: string;
  latitude: number | null;
  longitude: number | null;
  baseCompensation: string; // Decimal serialized as string
  // agreedCompensation is OMITTED from public view
  scheduledAt: string; // ISO datetime
  estimatedDuration: number | null; // minutes
  expiresAt: string | null;
  approvedApplicationId: string | null; // OMITTED from public view — not present
  createdAt: string;
  updatedAt: string;
  images: Image[];
  // GET /:id only:
  postedBy?: { id: string; name: string; image: string | null };
}
```

> Fields omitted from public view via Prisma `omit`: `isDeleted`, `deletedAt`, `deletedBy`, `approvedApplicationId`, `agreedCompensation`.

### `TaskOwner` (returned to task owner in some contexts)

Same as `TaskPublic` but additionally includes `agreedCompensation: string | null`. Still omits `isDeleted`, `deletedAt`, `deletedBy`.

### `Image`

```ts
interface Image {
  id: string;
  url: string;
  altText: string | null;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Endpoints

| Method | Path                          | Auth | Roles | Description                              |
| ------ | ----------------------------- | ---- | ----- | ---------------------------------------- |
| GET    | `/all-task`                   | —    | —     | List tasks with filters/pagination       |
| GET    | `/recently-posted`            | —    | —     | Get recently posted tasks                |
| GET    | `/my-posted-tasks`            | JWT  | USER  | Get all tasks posted by current user     |
| GET    | `/my-posted-task/:taskId`     | JWT  | USER  | Get specific task posted by current user |
| GET    | `/:id/related`                | —    | —     | Get up to 4 related tasks (same category)|
| GET    | `/:id`                        | —    | —     | Get task by ID                           |
| POST   | `/post-task`                  | JWT  | USER  | Create task                              |
| PATCH  | `/update-task/:id`            | JWT  | USER  | Update task (owner only)                 |
| DELETE | `/delete-task/:id`            | JWT  | USER  | Soft-delete task (owner only)            |
| POST   | `/:taskId/image`              | JWT  | USER  | Add images to task (max 5, owner only)   |
| PATCH  | `/:taskId/image`              | JWT  | USER  | Update task images (owner only)          |
| DELETE | `/:taskId/image/:imageId`     | JWT  | USER  | Delete a single task image (owner only)  |
| PATCH  | `/:taskId/mark-in-progress`   | JWT  | USER  | Tasker starts work                       |
| PATCH  | `/:taskId/mark-completed`     | JWT  | USER  | Tasker marks done                        |
| PATCH  | `/:taskId/approve-completion` | JWT  | USER  | Poster approves completion               |
| PATCH  | `/:taskId/request-revision`   | JWT  | USER  | Poster requests revision                 |

---

#### `POST /post-task`

Request:

```ts
{
  title: string;              // min 1, max 200 chars
  description: string;        // min 1
  category: TaskCategory;
  priority?: TaskPriority;    // default "MEDIUM"
  location: string;           // min 1, max 255 chars
  latitude?: number;
  longitude?: number;
  baseCompensation: number;   // positive
  scheduledAt: string;        // ISO 8601 datetime
  estimatedDuration: number;  // positive integer, in minutes
  expiresAt?: string;         // ISO 8601 datetime
}
```

Response `data` (status 201): Task object (owner view — see `TaskOwner` type above).

---

#### `GET /all-task`

Query params: standard pagination + `status`, `category`, `priority`, `searchTerm`, `sortBy`, `sortOrder` (see Query Filter Parameters above and `shared.md` for base params).

Response: paginated. `data` is `TaskPublic[]`. Each task includes `images: Image[]`.

---

#### `GET /:id`

Response `data`: Task object (public view) including:

- `images: Image[]`
- `postedBy: { id: string; name: string; image: string | null }`

---

#### `GET /recently-posted`

Get recently posted tasks. No authentication required.

Response `data`: Array of recently posted task objects (public view).

---

#### `GET /:id/related`

Get up to 4 tasks related to the given task by matching `category`. Only returns `OPEN`, non-deleted tasks, excluding the source task itself.

**Params:** `id` — ID of the source task.

Response `data`: Array of up to 4 `TaskPublic` objects (same shape as `GET /all-task` items, including `images`).

**Errors:**

- `404` — Task not found

---

#### `GET /my-posted-tasks`

Get all tasks posted by the current authenticated user.

Query params: standard pagination (see `shared.md`).

Response: paginated. `data` is array of task objects (owner view).

---

#### `GET /my-posted-task/:taskId`

Get a specific task posted by the current authenticated user.

**Params:** `taskId` — ID of the task.

Response `data`: Task object (owner view) including applications and other detailed information.

**Errors:**

- `403` — Unauthorized (not task owner)
- `404` — Task not found

---

#### `PATCH /update-task/:id`

Owner only. All fields optional. Same shape as create request but all optional.

Response `data`:

```ts
{
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
}
```

---

#### `POST /:taskId/image`

Add images to a task. Owner only. Rejects if task already has images.

Request:

```ts
{
  images: Array<{
    url: string; // valid URL, max 500 chars
    altText?: string; // optional, max 255 chars
  }>; // min 1, max 5 images
}
```

Response `data` (status 201): Array of created Image objects:

```ts
Array<{
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
  taskId: string;
}>;
```

**Validation errors:**

- `400` — Task already has images
- `403` — Unauthorized (not task owner)
- `404` — Task not found

---

#### `PATCH /:taskId/image`

Update the images of a task. Owner only. Specify which existing images to keep, and provide any new images to add. Total of kept + new images must not exceed 5.

Request:

```ts
{
  keepImageIds: string[];        // IDs of existing images to retain (can be empty [])
  newImages?: Array<{            // new images to add (defaults to [])
    url: string;                 // valid URL, max 500 chars
    altText?: string;            // optional, max 255 chars
  }>;
}
```

Response `data` (status 200): Final array of Image objects after update (ordered by `createdAt asc`):

```ts
Array<{
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
  taskId: string;
}>;
```

**Error responses:**

- `400` — `keepImageIds.length + newImages.length > 5` | Any `keepImageIds` entry does not belong to this task
- `403` — Unauthorized (not task owner)
- `404` — Task not found

**Notes:**

- Pass `keepImageIds: []` and `newImages: [...]` to replace all images.
- Pass `keepImageIds: [id1, id2]` and `newImages: []` to delete all except the kept ones.
- The delete and create operations run in a single database transaction.

---

#### `DELETE /:taskId/image/:imageId`

Deletes a single image from a task. Only the task owner can delete images.

**Auth:** Bearer token required  
**Roles:** USER

**Params:**

- `taskId` — ID of the task
- `imageId` — ID of the image to delete

**Success Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Image deleted successfully!",
  "data": null
}
```

**Error Responses:**

- `400` — Task ID or Image ID is missing
- `403` — Unauthorized (not task owner)
- `404` — Image not found or does not belong to this task

---

#### Status transition endpoints

All return `data: null` on success.

| Endpoint                      | Who                | Precondition     | Result status     |
| ----------------------------- | ------------------ | ---------------- | ----------------- |
| `/:taskId/mark-in-progress`   | Approved applicant | `ASSIGNED`       | `IN_PROGRESS`     |
| `/:taskId/mark-completed`     | Approved applicant | `IN_PROGRESS`    | `PENDING_REVIEW`  |
| `/:taskId/approve-completion` | Task poster        | `PENDING_REVIEW` | `PAYMENT_PENDING` |
| `/:taskId/request-revision`   | Task poster        | `PENDING_REVIEW` | `IN_PROGRESS`     |

---

## Task Status Machine

```
DRAFT
  ↓ (not implemented — tasks created as OPEN)
OPEN
  ↓ approve application
ASSIGNED
  ↓ tasker calls mark-in-progress
IN_PROGRESS
  ↓ tasker calls mark-completed
PENDING_REVIEW ──→ (poster calls request-revision) ──→ IN_PROGRESS
  ↓ poster calls approve-completion
PAYMENT_PENDING
  ↓ payment initiated (online: SSLCommerz init; cash: poster claims)
PAYMENT_INITIATED
  ↓ payment confirmed / IPN validated
COMPLETED

  Side exits:
  PAYMENT_PENDING / PAYMENT_INITIATED → DISPUTED (tasker declines cash payment)
  PAYMENT_PENDING / PAYMENT_INITIATED → PAYMENT_FAILED (payment fails or expires)
  Any active status → CANCELLED
  OPEN → EXPIRED (task expiry)
  COMPLETED → REFUNDED
```

---

## Route Protection Map

```ts
// Protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "POST /api/v1/task/post-task":                   { roles: ["USER"] },
  "PATCH /api/v1/task/update-task/:id":            { roles: ["USER"] },
  "DELETE /api/v1/task/delete-task/:id":           { roles: ["USER"] },
  "GET  /api/v1/task/my-posted-tasks":             { roles: ["USER"] },
  "GET  /api/v1/task/my-posted-task/:taskId":      { roles: ["USER"] },
  "POST /api/v1/task/:taskId/image":               { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/image":              { roles: ["USER"] },
  "DELETE /api/v1/task/:taskId/image/:imageId":    { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/mark-in-progress":   { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/mark-completed":     { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/approve-completion": { roles: ["USER"] },
  "PATCH /api/v1/task/:taskId/request-revision":   { roles: ["USER"] },
};

// Public — no auth required (optionalAuth used — attaches req.user if token present)
const publicRoutes = [
  "GET  /api/v1/task/all-task",
  "GET  /api/v1/task/recently-posted",
  "GET  /api/v1/task/:id/related",
  "GET  /api/v1/task/:id",
];
```

---

## Known Mismatches & Gotchas

### `agreedCompensation` is hidden from public task views

`agreedCompensation` is omitted from `GET /task/all-task` and `GET /task/:id`. To see the agreed amount, access payment records or the task via an owner-context route.

### Task creation always creates with `status = "OPEN"`

The `DRAFT` status exists in the enum but is never set in the service. All created tasks start as `OPEN`.

### `estimatedDuration` is in minutes

The Prisma schema comment says `// in minutes TODO: change to required`. It is currently optional in the validator despite being marked with `.positive()`. Frontend should treat it as optional.
