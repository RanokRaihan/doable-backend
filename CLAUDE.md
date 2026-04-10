# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev              # Start dev server with hot reload (ts-node-dev)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled production server
npx tsc --noEmit         # Type-check without emitting

npx prisma migrate dev --name <migration_name>   # Create and apply a migration
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Open Prisma database GUI
```

No test runner is configured — `npm test` exits with an error.

## Architecture Overview

**Get It Done** is a task marketplace REST API: users post tasks, others apply, and the platform handles payments and wallet/commission settlement.

### Request lifecycle

```
Route → auth() → authorize([roles]) → validateRequest(schema) → controller → service → Prisma
```

- **`src/app.ts`** — Express app setup: CORS, JSON middleware, route mounting, error handlers.
- **`src/routes/index.ts`** — Mounts all module routers under `/api/v1`.
- **`src/config/index.ts`** — Single typed config object; all env vars accessed here, never via `process.env` directly.
- **`src/config/database.ts`** — Singleton `prisma` client exported from here; import it in services.

### Module structure

Every module under `src/modules/<name>/` follows this exact layout:
- `<name>.route.ts` — Router with middleware chain
- `<name>.controller.ts` — Thin: extract input → call service → `ResponseHandler`
- `<name>.service.ts` — All business logic and Prisma queries
- `<name>.validation.ts` — Zod schemas (nested `body`/`params`/`query` keys)
- `<name>.interface.ts` — TypeScript types for the module
- `<name>.constant.ts` — Sortable fields, omit sets, etc.

### Key utilities (`src/utils/`)

| Utility | Purpose |
|---|---|
| `asyncHandler(fn)` | Wraps async controllers, forwards errors to `globalErrorHandler` |
| `AppError(status, msg)` | Throw for operational errors |
| `ResponseHandler.ok/created/unauthorized/notFound` | Standardized response shapes |
| `parseQuery(req)` + `buildPrismaQuery()` + `buildMeta()` | Pagination, search, sort, filter |
| `createToken(payload, secret, expiry)` | JWT sign utility |
| `createTnxId("TNX"/"WTNX")` | Transaction ID generator |

### Authentication

- `auth()` middleware verifies `Authorization: Bearer <token>`, attaches `req.user` (typed in `src/types/global.d.ts`).
- JWT payload shape: `{ userId, email, name, role: UserRole, profileStatus }`.
- Refresh token is stored as an httpOnly cookie.

### Error handling

- Throw `new AppError(statusCode, message)` in services for operational errors.
- `globalErrorHandler` in `src/middlewares/errorHandler.ts` handles `ZodError`, `PrismaClientKnownRequestError`, and `AppError`.
- Error type strings: `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `NOT_FOUND`, `CONFLICT`.

### Database patterns

- Always filter `isDeleted: false` for `User` and `Task` queries (both use soft delete).
- Omit sensitive fields via Prisma `omit` option using constants from `<module>.constant.ts`.
- `agreedCompensation` on `Task` is set when an application is approved (copied from `proposedCompensation`).
- Commission rate comes from config (`COMMISSION_RATE`), stored per-payment in the `commissionRate` field.

### Task status machine

```
DRAFT → OPEN → ASSIGNED → IN_PROGRESS → PENDING_REVIEW → PAYMENT_PROCESSING → COMPLETED
                                                       ↘ (revision) → IN_PROGRESS
                                                                              ↘ PAYMENT_FAILED
```

### Validation schemas

Zod schemas use nested structure — always wrap fields under `body`, `params`, or `query`:

```ts
const schema = z.object({
  body: z.object({ ... }).strict(),
  params: z.object({ id: z.string() }).optional(),
});
```

## TypeScript Strictness

`strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`. Use Prisma-generated types for model shapes — do not redefine them manually.

## Important Notes

- CORS currently hardcoded to `http://localhost:3000` in `app.ts`; `FRONTEND_URL` env var should override this for production.
- `GET /api/v1/user/` (all users) is a temporary route — do not expand it.
- `src/modules/payment/payment.dummy.service.ts` is a placeholder; do not use in production logic.
- `docs/` folder contains design notes: `auth-optimization.md`, `endpoint-list.md`, `schema-improvements.md`, `response-utility.md`.
- See `AGENTS.md` for full route tables, database schema details, and payment flows.
