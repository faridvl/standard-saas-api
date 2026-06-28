# Changes

## ✅ COMPLETADO

- Initial monorepo boilerplate with NestJS + Hexagonal Architecture
- Identity service: tenant registration (POST /auth/register) with atomic Tenant+User transaction
- Identity service: login with JWT (POST /auth/login)
- Identity service: /auth/me and /auth/test endpoints
- Identity service: user creation and listing (POST /users, GET /users) scoped by tenant
- Medical records service: patient CRUD (POST, GET list, GET by UUID)
- Medical records service: appointments CRUD (POST, GET list, GET by UUID, PATCH, GET by patient)
- Medical records service: medical controls (POST, GET by patient, GET by UUID)
- Medical records service: inventory/products (full CRUD with soft-delete)
- CORS config (identity: `*`, medical-records: restricted to Vercel frontend in prod)
- Zod validation pipe + GlobalExceptionFilter with structured error response
- PostgreSQL dual-database setup via docker-compose + init-db.sh
- Prisma 7 driver adapter pattern (pg.Pool, max: 1, lazy connect)
- PrismaService per-service (identity uses IDENTITY_DB_URL, medical-records uses MEDICAL_RECORDS_DB_URL)

## 🔄 EN PROGRESO

_(nothing currently marked as in-progress in code)_

## 📋 PENDIENTE

### Alta prioridad

- **Delete appointment endpoint**: `DeleteAppointmentUseCase` is referenced but commented out in `AppointmentController` constructor and the `@Delete` route is commented out. The use case file likely doesn't exist yet.
- **FollowUp persistence**: `CreateMedicalControlUseCase` accepts `followUp` in the DTO and validates it, but the storage call is commented out (`// if (dto.followUp?.hasFollowUp) { ... }`). A FollowUp table/storage needs to be built.
- **RolesGuard wiring**: `RolesGuard` is exported from core but not used in any controller. Role-based access control is not enforced beyond having the `role` in the JWT.

### Media prioridad

- **`CreateUserPersistence` type**: There's a `//TODO(!): mover esto` in `packages/identity/src/infrastructure/adapters/user.storage.ts:8` — the type is defined inline and should be moved to the domain layer.
- **DENTAL speciality in MedicalControl**: `DentalFindings` interface is defined in types but `CreateMedicalControlSchema` only has AUDIOLOGY and GENERAL union branches — DENTAL schema is missing.
- **`AppointmentType` management endpoints**: The `AppointmentType` table exists in the DB schema but there are no controller/use case/storage implementations for creating or listing appointment types.
- **`TenantStorage.findByUuid` hardcodes `TenantPlan.PREMIUM`**: Plan is always returned as PREMIUM regardless of actual data (no plan field in the DB schema).
- **Identity service `env` schema** only validates `JWT_SECRET` and `PORT` — `IDENTITY_DB_URL` is read directly from `process.env` inside `PrismaService`, bypassing validation.

## 🔍 DESCUBIERTO EN COMMITS

- `resolve` (×9 commits) — indicates a series of deployment/config fixes for Railway/Vercel
- `main for railway` — service was configured for Railway deployment; currently Vercel is also mentioned (CORS whitelists Vercel URL)
- `maxDuration` — likely added Vercel `maxDuration` config (since removed per commit `05c0663`)
- DynamoDB was initially intended for some storage but was fully removed/commented out in favor of Prisma+PostgreSQL
- The project is oriented toward medical/audiology clinics (CABYS code field in Product, audiology-specific findings schema)

## ❌ INCOMPLETO EN CÓDIGO

- **`packages/core/src/adapters/repositories/dynamo/dynamo-base.repository.ts`**: Entire file is commented out — dead code, DynamoDB abandoned.
- **`packages/core/src/index.ts`**: Exports `ZodValidationPipe` and `GlobalExceptionFilter` twice (duplicate export lines) — cosmetic issue.
- **DELETE /appointments/:uuid**: Route exists in controller file but is commented out — endpoint not available.
- **followUp block in `CreateMedicalControlUseCase`**: 8-line commented block for saving follow-up data. FollowUp table doesn't exist in schema yet.
