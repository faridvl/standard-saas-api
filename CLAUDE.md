# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project

SaaS API monorepo for a multi-tenant medical management system (currently oriented toward audiology/medical clinics). Implements per-tenant data isolation at the application layer using `tenantUuid` on every query.

## Stack & exact versions

- **Runtime:** Node.js 20.x (see `.nvmrc`)
- **Framework:** NestJS 11.x
- **Language:** TypeScript 5.1
- **ORM:** Prisma 7.4.0 with `driverAdapters` preview feature + `@prisma/adapter-pg`
- **Validation:** Zod 4.x (schemas live alongside DTOs, inferred types via `z.infer`)
- **Auth:** `@nestjs/jwt` + Bearer token; `JwtPayload` defined in `packages/core`
- **DB:** PostgreSQL 15 (two separate databases: `identity_db`, `medical_records_db`)
- **Package manager:** Yarn 1 workspaces (`nohoist` configured for Prisma)
- **Local dev:** `ts-node-dev` with `tsconfig-paths` for path aliases

## Running the project locally

```bash
# 1. Start PostgreSQL (creates both databases via init-db.sh)
yarn db:up

# 2. Install dependencies
yarn install

# 3. Generate Prisma clients (required after schema changes or first install)
yarn identity:prisma:gen
yarn records:prisma:gen

# 4. Run migrations
yarn identity:prisma:migrate
yarn records:prisma:migrate

# 5. Start services (separate terminals or together)
yarn local:identity    # port 7170
yarn local:records     # port 7071
yarn local:all         # both concurrently
```

Lint & format:
```bash
yarn lint       # ESLint with auto-fix
yarn format     # Prettier
```

## Environment variables

Each service has its own `.env` file.

**`packages/identity/.env`**
- `IDENTITY_DB_URL` — PostgreSQL connection string for identity database
- `JWT_SECRET` — min 10 chars, used to sign/verify tokens

**`packages/medical-records/.env`**
- `MEDICAL_RECORDS_DB_URL` — PostgreSQL connection string for medical records database
- `JWT_SECRET` — must match identity service value
- `PORT` — optional, defaults to 7071

Both services read `NODE_ENV`.

## .claude/ index

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](.claude/ARCHITECTURE.md) | Folder structure, request flow, architectural decisions |
| [DATABASE.md](.claude/DATABASE.md) | Full schema, indexes, migration history |
| [ENDPOINTS.md](.claude/ENDPOINTS.md) | All endpoints with request/response shapes |
| [PATTERNS.md](.claude/PATTERNS.md) | Code conventions, error handling, validation patterns |
| [CHANGES.md](.claude/CHANGES.md) | Completed / in-progress / pending work |

## Related frontend repo

- **Site local:** `D:\Documentos\Proyectos\React\next-audiology-files`
- **Site GitHub:** https://github.com/faridvl/next-audiology-files.git
- **Site producción:** https://next-audiology-files.vercel.app

CORS in `medical-records` already whitelists `https://next-audiology-files.vercel.app` in production.

## Mandatory rule

**When you implement a new endpoint, update `.claude/ENDPOINTS.md`** with the exact request body, query params, and response shape before finishing.

## Regla de features cross-repo

Cuando implementes un endpoint nuevo o lo modifiques:
1. Actualiza `.claude/ENDPOINTS.md` con el contrato exacto antes de terminar
2. El site leerá ese contrato — incluir tipos de request/response precisos
3. Marcar en `.claude/CHANGES.md` qué cambió

Los incompletos que más afectan al site:
- `DELETE /appointments/:uuid` — site lo necesita para cancelar citas
- `followUp` — formulario en site lo envía pero API lo descarta silenciosamente
- `AppointmentType` endpoints (`GET`/`POST`) — sin estos el form de nueva cita no puede poblar el selector de tipos
