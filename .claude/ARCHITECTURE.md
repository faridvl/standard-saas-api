# Architecture

## Monorepo structure

```
packages/
  core/          — shared library (@project/core), published as workspace dep
  identity/      — auth & user management microservice (port 7170)
  medical-records/ — patient/appointment/inventory microservice (port 7071)
```

`packages/core` is built to `dist/` and consumed by the other two packages via `"@project/core": "*"` in their `package.json`. Run `yarn workspace @project/core build` if you touch core files — the other services import from the compiled output.

## Per-package structure (Hexagonal / Clean Architecture)

```
src/
  app/
    controllers/   — NestJS @Controller classes (HTTP entry points)
    dtos/          — Zod schemas + inferred TS types (co-located)
    *.module.ts    — NestJS module wiring (imports, providers, exports)
  domain/
    entities/      — plain TS classes representing core business objects
    use-cases/     — one class per business operation, always has execute()
    dtos/          — domain-level DTOs (used internally, not from HTTP)
    types/         — enums, interfaces, domain type definitions
    repositories/  — repository interfaces (contracts only)
    validations/   — additional Zod schemas used inside domain
  infrastructure/
    adapters/
      prisma/      — PrismaService (wraps PrismaClient with pg Pool adapter)
      *Storage.ts  — concrete repository implementations (named *Storage)
    security/      — BcryptService
  main.ts          — NestFactory bootstrap
```

## Request flow (end to end)

```
HTTP Request
  → NestJS Router (controller method)
  → @UsePipes(ZodValidationPipe) — validates body against Zod schema
  → @UseGuards(AuthGuard) — verifies Bearer JWT, attaches payload to request
  → @CurrentUser() decorator — extracts JwtPayload from request
  → Use Case .execute() — orchestrates business logic
  → *Storage method — Prisma query scoped by tenantUuid
  → Response (plain object, serialized by NestJS)
  ↕ errors throw NestJS HttpException → caught by GlobalExceptionFilter
```

Error responses always have shape:
```json
{ "success": false, "statusCode": N, "message": "...", "details": [...] | null, "timestamp": "ISO" }
```

## core package exports

- `ZodValidationPipe` — validates body against a ZodSchema, throws `BadRequestException` with `details[]`
- `AuthGuard` — verifies JWT from `Authorization: Bearer <token>` header
- `RolesGuard` — (exists but not wired anywhere currently)
- `CurrentUser` decorator — extracts `JwtPayload` from `request.user`
- `GlobalExceptionFilter` — unified error response shape
- `AppLogger` — NestJS-injectable logger
- `JwtPayload` interface — `{ sub, email, role, tenantId, tenantUuid }`
- `env` — validated env config (Zod-parsed `process.env`)
- `BaseError`, `NotFoundError`, `ApiErrorCode` enum

## Key architectural decisions

- **Prisma driver adapter pattern**: Both services use `PrismaPg` adapter with a `pg.Pool` instead of the classic `prisma.$connect()`. Connection is lazy (on first query). Pool size is intentionally `max: 1` for serverless/Railway compatibility.
- **DynamoDB was planned, then abandoned**: `packages/core/src/adapters/repositories/dynamo/dynamo-base.repository.ts` is fully commented out — Prisma+PG replaced it.
- **No global prefix**: Routes are at root (`/auth`, `/patients`, etc.) — no `/api/v1` prefix.
- **CORS**: Identity allows `origin: '*'`. Medical-records restricts to the Vercel frontend in production.
- **Multi-tenancy**: Enforced in every storage method by filtering on `tenantUuid` extracted from the JWT. There is no middleware-level RLS — it's app-level.
- **JWT token lifetime**: Identity signs for `1h`; medical-records module signs/verifies at `1d` — only identity issues tokens, medical-records only verifies them.
- **Transactions**: `RegisterTenantUseCase` creates Tenant + User atomically via `prisma.$transaction`.
