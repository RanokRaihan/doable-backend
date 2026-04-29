# CLAUDE.md

**Get It Done** is a Node.js/TypeScript REST API for a task marketplace — users post tasks, others apply, and the platform handles payment and wallet/commission settlement. Stack: Express 5, Prisma 6 (PostgreSQL), Zod 4, JWT (access + refresh tokens), bcryptjs, Nodemailer, SSLCommerz. No test runner is configured. See `AGENTS.md` for the module map and file locations. See `api-contracts/index.md` for all endpoint contracts, shared types, and auth patterns.

---

## Development Commands

```bash
npm run dev                                   # ts-node-dev --respawn --transpile-only src/server.ts
npm run build                                 # tsc
npm run start                                 # node dist/server.js
npx tsc --noEmit                              # type-check without emitting
npx prisma migrate dev --name <name>          # create and apply a migration
npx prisma generate                           # regenerate Prisma client after schema change
npx prisma studio                             # open database GUI
```

---

## Coding Conventions

### File and folder naming

- All source files use `camelCase.ts`
- Module files follow `<module>.<type>.ts` — e.g., `task.service.ts`, `task.route.ts`
- Modules live under `src/modules/<name>/` — each has exactly six files: `.route.ts`, `.controller.ts`, `.service.ts`, `.validation.ts` (or `.validator.ts`), `.interface.ts`, `.constant.ts`
- Shared utilities in `src/utils/`; global interfaces in `src/interface/`; Prisma singleton in `src/config/database.ts`

### Request lifecycle

```
Route → auth() → authorize([roles]) → validateRequest(schema) → controller → service → Prisma
```

### Controllers

Thin — extract input, call one service function, return via `ResponseHandler`:

```ts
const myController: RequestHandler = asyncHandler(async (req, res) => {
  const result = await myService(req.body, req.user!.id);
  return ResponseHandler.ok(res, "Message", result, { path: req.path });
});
```

Never put Prisma queries or business logic in controllers.

### Services

All business logic and Prisma queries live here. Import `prisma` from `src/config/database.ts`. Throw `new AppError(statusCode, message)` for operational errors.

### Validation schemas

Always nest Zod fields under `body`, `params`, or `query`. Use `.strict()` on body schemas:

```ts
z.object({
  body: z.object({ field: z.string() }).strict(),
  params: z.object({ id: z.string() }).optional(),
});
```

### Error handling

- Throw `new AppError(statusCode, message)` in services — never in controllers
- Controllers are wrapped in `asyncHandler()` — errors propagate to `globalErrorHandler`
- `globalErrorHandler` handles `ZodError`, `PrismaClientKnownRequestError`, and `AppError`
- Do not add `try/catch` in controllers

### Response utilities

Use `ResponseHandler` static methods — never the legacy `sendResponse()`:

```ts
ResponseHandler.ok(res, message, data, options); // 200
ResponseHandler.created(res, message, data, options); // 201
ResponseHandler.unauthorized(res, message, path); // 401
ResponseHandler.notFound(res, message, path); // 404
```

### TypeScript

- Compiler flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Use Prisma-generated types for model shapes — do not redefine them manually
- All env vars via `config` from `src/config/index.ts` — never access `process.env` directly
- Module-specific types in `<module>.interface.ts` — never in controllers

### Database

- Always filter `isDeleted: false` for `User` and `Task` queries (both use soft delete)
- Omit sensitive fields at query time via Prisma `omit` using constants from `<module>.constant.ts`
- Two omit sets for tasks: `taskSensitiveFieldsPublic` (strips `isDeleted`, `deletedAt`, `deletedBy`, `approvedApplicationId`, `agreedCompensation`) and `taskSensitiveFieldsOwner` (strips `isDeleted`, `deletedAt`, `deletedBy` only)

### Pagination

Use `parseQuery(req, options?)` + `buildPrismaQuery()` + `buildMeta()` from `src/utils/query.ts` for all list endpoints.

### Transaction IDs

`createTnxId("TNX")` for payment transactions; `createTnxId("WTNX")` for wallet transactions.

---

## Do NOT

- Do not traverse the full codebase speculatively — check `AGENTS.md` for module/file locations first
- Do not re-read files already described in `AGENTS.md` unless you need the exact implementation detail
- Do not assume module file paths — verify against the module map in `AGENTS.md`
- Do not change any endpoint shape, auth pattern, or response format without updating the relevant module file in `api-contracts/` first
- Do not read all api-contract files upfront — check `api-contracts/index.md` first, then read only the module file relevant to the current task
- Do not add `try/catch` in controllers — `asyncHandler` propagates errors
- Do not put Prisma queries in controllers
- Do not access `process.env` directly — use `config` from `src/config/index.ts`
- Do not redefine Prisma model types manually
- Do not use `sendResponse()` (legacy) — use `ResponseHandler` static methods

---

## Mandatory Post-Task Protocol

After any task that creates or deletes a file, renames something, or makes an architectural decision, you MUST update `AGENTS.md` before the task is considered done:

1. Add or remove the file from the module/service map with a one-line purpose description
2. Append any architectural decision to `## Architectural Decisions`
3. Add a one-line entry to `## Recent Changes` at the top of `AGENTS.md` (format: `YYYY-MM-DD — what changed`)

Additionally, if the task touches any of the following, update the relevant module file in `api-contracts/` immediately:

- Any endpoint (added, removed, renamed, param or response shape changed)
- Any shared type or enum
- Auth flow or token behavior
- Error response format
