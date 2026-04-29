# API Contract — User (`/api/v1/user`)

---

## Enums

### `Gender`

```ts
type Gender = "MALE" | "FEMALE" | "OTHER";
```

Used in: `PATCH /user/complete-profile`, `PATCH /user/update-profile`.

### `Provider`

```ts
type Provider = "GOOGLE" | "CREDENTIALS";
```

Used in: user object. Affects which auth operations are allowed (e.g. password change only for `"CREDENTIALS"`).

> `UserRole` and `UserProfileStatus` are defined in `api-contract-auth.md` — they are used here in response shapes.

---

## Shared Types

### `UserPublic`

```ts
interface UserPublic {
  id: string;
  image: string | null;
  name: string;
  bio: string | null;
}
```

### `UserProfile` (own profile)

```ts
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: UserProfileStatus;
  provider: Provider;
  image: string | null;
  emailVerified: boolean;
}
```

---

## Endpoints

| Method | Path                    | Auth | Roles | Description                                    |
| ------ | ----------------------- | ---- | ----- | ---------------------------------------------- |
| GET    | `/`                     | —    | —     | Get all users (temporary — remove before prod) |
| POST   | `/register/credentials` | —    | —     | Register new user                              |
| GET    | `/my-profile`           | JWT  | USER  | Get own full profile                           |
| PATCH  | `/complete-profile`     | JWT  | USER  | Complete profile (one-time)                    |
| PATCH  | `/update-profile`       | JWT  | USER  | Update profile fields                          |
| PATCH  | `/update-avatar`        | JWT  | USER  | Update avatar URL                              |
| DELETE | `/delete-account`       | JWT  | USER  | Soft-delete own account                        |
| GET    | `/:id/public`           | —    | —     | Get full public profile with stats and reviews |
| GET    | `/:id`                  | —    | —     | Get public profile by ID                       |

---

#### `POST /register/credentials`

Request:

```ts
{
  email: string; // max 255 chars, valid email
  name: string; // min 1, max 100 chars
  password: string; // min 8, max 255 chars
}
```

Response `data` (status 201):

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole; // always "USER" on registration
  createdAt: string;
  updatedAt: string;
}
```

Side effect: creates a `Wallet` record for the user in the same transaction.

---

#### `GET /my-profile`

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileStatus: UserProfileStatus;
  provider: Provider;
  image: string | null;
  emailVerified: boolean;
}
```

---

#### `PATCH /complete-profile`

Can only be called when `profileStatus === "INCOMPLETE"`. Sets `profileStatus` to `"COMPLETE"`.

Request:

```ts
{
  dateOfBirth: string;  // ISO date, coerced to Date
  gender: Gender;       // "MALE" | "FEMALE" | "OTHER"
  address: string;      // min 1, max 255 chars
  phone: string;        // regex: /^01\d{9}$/ (11-digit Bangladesh mobile)
  bio?: string;         // max 500 chars
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    dateOfBirth: string;
    address: string;
    phone: string;
    gender: Gender;
    bio: string | null;
    emailVerified: boolean;
    profileStatus: UserProfileStatus;
    createdAt: string;
    updatedAt: string;
  }
  accessToken: string; // new token with updated profileStatus
  refreshToken: string; // also set as cookie
}
```

---

#### `PATCH /update-profile`

Requires `profileStatus === "COMPLETE"` (403 otherwise).

Request (all optional):

```ts
{
  name?: string;         // min 1, max 100 chars
  dateOfBirth?: string;  // ISO date
  gender?: Gender;
  address?: string;      // min 1, max 255 chars
  phone?: string;        // regex: /^01\d{9}$/
  bio?: string;          // max 500 chars
}
```

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  dateOfBirth: string | null;
  address: string | null;
  phone: string | null;
  gender: Gender | null;
  bio: string | null;
  profileStatus: UserProfileStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

#### `PATCH /update-avatar`

Requires `profileStatus === "COMPLETE"`.

Request:

```ts
{
  image: string;
} // valid URL, max 255 chars
```

Response `data`:

```ts
{
  id: string;
  email: string;
  name: string;
  image: string;
  updatedAt: string;
}
```

---

#### `DELETE /delete-account`

Soft-delete: sets `isDeleted = true`, `deletedAt`, `deletedBy = userId`. Response `data`: `null`.

---

#### `GET /:id`

Public profile. Response `data`:

```ts
{
  id: string;
  image: string | null;
  name: string;
  bio: string | null;
}
```

---

#### `GET /:id/public`

Full public profile with stats, reviews, and recent tasks. No auth required.

**Params:** `id` — user CUID (min length 1).

**Errors:**

- `400` — validation error (empty id)
- `404 NOT_FOUND` — user not found or soft-deleted

**Response `data` (status 200):**

```ts
{
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  memberSince: string; // ISO date (User.createdAt)

  stats: {
    asPoster: {
      tasksPosted: number; // non-deleted tasks, excluding DRAFT
      averageRating: number | null; // avg rating received as task poster; null if no reviews
      reviewCount: number;
    }
    asDoer: {
      tasksCompleted: number; // approved applications where task.status = COMPLETED
      completionRate: number | null; // tasksCompleted / totalApprovedApplications (0–1, 2dp); null if no approved apps
      averageRating: number | null; // avg rating received as task doer; null if no reviews
      reviewCount: number;
    }
  }

  // Up to 10 public reviews, newest first
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    author: { id: string; name: string; image: string | null };
    task: { id: string; title: string };
  }>;

  // Up to 10 tasks with status OPEN | IN_PROGRESS | COMPLETED, newest first
  postedTasks: Array<{
    id: string;
    title: string;
    category: TaskCategory;
    status: TaskStatus;
    baseCompensation: string; // Decimal serialized as string
    location: string;
    createdAt: string;
  }>;
}
```

**Privacy guarantees:** `email`, `password`, `phone`, `address`, `dateOfBirth`, `role`, `profileStatus`, `emailVerified`, all auth/security fields, and soft-delete fields are **never** included. DRAFT, CANCELLED, and EXPIRED tasks are excluded. Reviews with `isPublic = false` are excluded.

---

## Route Protection Map

```ts
// Protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "GET  /api/v1/user/my-profile":       { roles: ["USER"] },
  "PATCH /api/v1/user/complete-profile": { roles: ["USER"] },
  "PATCH /api/v1/user/update-profile":  { roles: ["USER"] },
  "PATCH /api/v1/user/update-avatar":   { roles: ["USER"] },
  "DELETE /api/v1/user/delete-account": { roles: ["USER"] },
};

// Public — no auth required
const publicRoutes = [
  "GET  /api/v1/user/",
  "POST /api/v1/user/register/credentials",
  "GET  /api/v1/user/:id",
  "GET  /api/v1/user/:id/public",
];
```

---

## Known Mismatches & Gotchas

### `GET /api/v1/user/` returns all users — temporary

This route has no auth, no pagination, and returns every user in the database. Must be removed before production.

### Phone validation is Bangladesh-specific

The phone regex `/^01\d{9}$/` matches 11-digit Bangladeshi mobile numbers starting with `01`. Non-BD phone formats will fail validation.
