# API Contract — Auth (`/api/v1/auth`)

---

## Enums

### `UserRole`

```ts
type UserRole = "USER" | "ADMIN" | "MODERATOR";
```

Used in: JWT payload, user profile, route authorization.

### `UserProfileStatus`

```ts
type UserProfileStatus = "INCOMPLETE" | "COMPLETE" | "SUSPENDED";
```

Used in: user object, JWT payload. After registration `profileStatus = "INCOMPLETE"`. After `PATCH /user/complete-profile` it becomes `"COMPLETE"`.

---

## Authentication Flow

### Token issuance

**Login** — `POST /api/v1/auth/login`

Request body:

```ts
{
  email: string;
  password: string;
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    image: string | null;
  }
  accessToken: string; // also returned in body for convenience
  refreshToken: string; // ALSO set as cookie (see below)
}
```

### Cookie delivery

The refresh token is set as a `Set-Cookie` header on: **login**, **refresh-token**, **complete-profile**, and **verify-email**.

| Attribute  | Value                                |
| ---------- | ------------------------------------ |
| Name       | `refreshToken`                       |
| `httpOnly` | `true`                               |
| `secure`   | `true` in production, `false` in dev |
| `sameSite` | `"strict"`                           |
| `maxAge`   | 7 days (604800000 ms)                |

> **Note:** The refresh token is returned in the response body **and** as a cookie. The cookie is the canonical mechanism; the body copy is for clients that cannot access cookies.

### Sending the access token

All protected endpoints require:

```
Authorization: Bearer <accessToken>
```

The `auth` middleware extracts the token from `Authorization` header only. It does NOT check cookies for the access token.

### Token refresh

**`POST /api/v1/auth/refresh-token`** — no `auth` middleware required.

Reads refresh token from: `req.body.refreshToken` **OR** `req.cookies.refreshToken` (body takes precedence).

Response `data`:

```ts
{
  accessToken: string; // new access token
  refreshToken: string; // new refresh token (also set as cookie)
}
```

A new refresh token is always issued and the cookie is rotated.

### JWT payload shape

```ts
interface IJwtPayload {
  userId: string; // cuid, e.g. "clxyz..."
  email: string;
  name: string;
  role: UserRole; // "USER" | "ADMIN" | "MODERATOR"
  profileStatus: string; // "INCOMPLETE" | "COMPLETE" | "SUSPENDED"
  emailVerified: boolean;
  iat?: number; // issued-at (standard JWT claim)
  exp?: number; // expiry (standard JWT claim)
}
```

Algorithm: `HS256`. Secrets from `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.

### What a 401 means

The `auth` middleware throws 401 when:

- `Authorization` header is missing or not `Bearer <token>`
- Token is invalid or expired
- User account is suspended (`profileStatus === "SUSPENDED"`)

On 401, discard the access token and use `POST /auth/refresh-token`. If refresh also fails (401), redirect to login.

---

## Endpoints

| Method | Path                       | Auth | Description                        |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/login`                   | —    | Login with email/password          |
| POST   | `/logout`                  | —    | Clear refresh token cookie         |
| POST   | `/refresh-token`           | —    | Issue new access + refresh token   |
| GET    | `/current-user`            | JWT  | Get authenticated user             |
| GET    | `/loggedin-user`           | JWT  | Alias for `/current-user`          |
| POST   | `/update-password`         | JWT  | Change password (CREDENTIALS only) |
| POST   | `/forgot-password`         | —    | Send password reset email          |
| POST   | `/reset-password`          | —    | Reset password with token          |
| GET    | `/email-verification`      | JWT  | Get email verification status      |
| POST   | `/send-verification-email` | JWT  | Send email verification link       |
| POST   | `/verify-email`            | —    | Verify email with token            |

---

#### `POST /login`

Request:

```ts
{
  email: string;
  password: string;
}
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    image: string | null;
  }
  accessToken: string;
  refreshToken: string; // also set as httpOnly cookie
}
```

Errors: `AUTHENTICATION_ERROR` (400) for wrong credentials, `ACCOUNT_LOCKED` (423).

---

#### `POST /logout`

No body required. Clears `refreshToken` cookie. Response `data`: `null`.

---

#### `POST /refresh-token`

Request body (optional — also reads from cookie):

```ts
{ refreshToken?: string }
```

Response `data`:

```ts
{
  accessToken: string;
  refreshToken: string;
}
```

---

#### `GET /current-user` / `GET /loggedin-user`

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

#### `POST /update-password`

> ⚠️ No `validateRequest` middleware — validation is in the service layer only.

Request:

```ts
{
  oldPassword: string;
  newPassword: string;
} // newPassword min 8 chars
```

Response `data`: `null`.

---

#### `POST /forgot-password`

> ⚠️ No `validateRequest` middleware.

Request:

```ts
{
  email: string;
}
```

Response `data`: `null`. Always returns 200 even if email not found (security).
Side effect: sends email with `resetToken` link to `FRONTEND_URL/reset-password?token=<token>&email=<email>`. Token expires in 15 minutes.

---

#### `POST /reset-password`

> ⚠️ No `validateRequest` middleware.

Request:

```ts
{
  email: string;
  newPassword: string;
  resetToken: string;
}
```

`resetToken` is the raw token from the URL (not hashed). Response `data`: `null`.

---

#### `GET /email-verification`

Response `data`:

```ts
{
  emailVerified: boolean;
  emailVerificationSentAt: string | null; // ISO datetime
  emailVerificationExpiresAt: string | null; // ISO datetime
  emailVerifiedAt: string | null; // ISO datetime
}
```

---

#### `POST /send-verification-email`

No request body. Uses `req.user.email` from JWT. Rate-limited to 1 request per minute.
Response `data`: `null`.

---

#### `POST /verify-email`

Request:

```ts
{
  token: string;
} // raw token from email URL
```

Response `data`:

```ts
{
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    profileStatus: UserProfileStatus;
    emailVerified: boolean;
  }
  accessToken: string;
  refreshToken: string; // also set as httpOnly cookie
}
```

---

## Route Protection Map

```ts
// Protected — require: Authorization: Bearer <accessToken>
const protectedRoutes = {
  "GET  /api/v1/auth/current-user":             { roles: ["USER", "ADMIN", "MODERATOR"] },
  "GET  /api/v1/auth/loggedin-user":            { roles: ["USER", "ADMIN", "MODERATOR"] },
  "POST /api/v1/auth/update-password":          { roles: ["USER", "ADMIN", "MODERATOR"] },
  "GET  /api/v1/auth/email-verification":       { roles: ["USER", "ADMIN", "MODERATOR"] },
  "POST /api/v1/auth/send-verification-email":  { roles: ["USER", "ADMIN", "MODERATOR"] },
};

// Public — no auth required
const publicRoutes = [
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/refresh-token",
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/reset-password",
  "POST /api/v1/auth/verify-email",
];
```

---

## Known Mismatches & Gotchas

### `PATCH /complete-profile` returns new tokens

After completing a profile, the response includes fresh `accessToken` and `refreshToken` with `profileStatus: "COMPLETE"`. The client must replace stored tokens.

### Auth routes missing `validateRequest` middleware

`POST /auth/update-password`, `POST /auth/forgot-password`, and `POST /auth/reset-password` do **not** use the `validateRequest` Zod middleware. Request body validation only happens implicitly in the service layer (via `bcrypt.compare`, etc.). Invalid inputs may produce unhelpful error messages.

### Refresh token in login response body

The `refreshToken` is returned in the login response body **and** set as an httpOnly cookie. The body copy is redundant for browser clients but needed for mobile/native clients that handle cookies manually.

### Account lock threshold is currently 40, not 5

`auth.service.ts` increments the failed login counter but only locks after **40** failures (there is a comment saying it should be 5; the 40 is for testing). Do not rely on locking as a security mechanism in production without fixing this.
