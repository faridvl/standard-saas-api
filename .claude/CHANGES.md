# Changes

## ✅ COMPLETADO

- Initial monorepo boilerplate with NestJS + Hexagonal Architecture
- Identity service: tenant registration (POST /auth/register) with atomic Tenant+User transaction
- Identity service: login with JWT (POST /auth/login)
- Identity service: /auth/me and /auth/test endpoints
- Identity service: user creation and listing (POST /users, GET /users) scoped by tenant
- Medical records service: patient CRUD (POST, GET list, GET by UUID)
- Medical records service: appointments CRUD (POST, GET list, GET by UUID, PATCH, GET by patient)
- Medical records service: `GET /appointments/months` — meses con al menos una cita CONFIRMED futura, para poblar un selector de filtro (usado por audiocolors-backoffice)
- Medical records service: medical controls (POST, GET by patient, GET by UUID)
- Medical records service: inventory/products (full CRUD with soft-delete)
- CORS config (identity: `*`, medical-records: restricted to Vercel frontend in prod)
- Zod validation pipe + GlobalExceptionFilter with structured error response
- PostgreSQL dual-database setup via docker-compose + init-db.sh
- Prisma 7 driver adapter pattern (pg.Pool, max: 1, lazy connect)
- Medical records service: bitácora de pacientes (`PatientActivity` + `GET /patient-activity`, `/actors`, `/summary`). Se registra desde alta/edición de paciente, contactos, notas, documentos y próxima cita. Tabla nueva vacía, sin backfill
- Medical records service: estado del paciente (`status` ACTIVE/INACTIVE/DECEASED, `PUT /patients/:uuid/status`), filtros `status`/`branchUuid`/`appointmentTypeUuid` en `GET /patients`, filtros `branchUuid`/`appointmentTypeUuid` en `GET /patient-activity`, acción `STATUS_CHANGED`
- PrismaService per-service (identity uses IDENTITY_DB_URL, medical-records uses MEDICAL_RECORDS_DB_URL)
- Medical records service: calendario suscrito (`CalendarFeed` + `GET/POST/DELETE /calendar-feed`, público `GET /calendar-feed/:token.ics` con `branch` y `color`). Un enlace por usuario; el evento lleva el nombre completo del paciente. `DEFAULT_APPOINTMENT_HOUR_UTC` pasa a `appointment.types.ts` (lo comparten `next-appointment` y el calendario). Tabla nueva vacía

- Medical records service: indicadores `warrantyExpired` y `renewPrescription` (columnas `warrantyExpiredSince`/`renewPrescriptionSince`, filtros en `GET /patients`, acciones `WARRANTY_EXPIRED_CHANGED`/`RENEW_PRESCRIPTION_CHANGED`); `warrantyDocumentUuid` en el paciente vía `PATCH /patients/:uuid` (se limpia al borrar el documento); `PATCH` de documentos acepta `category` (acción `DOCUMENT_CATEGORY_CHANGED`). Migración `20261020120000_add_warranty_expired_renew_prescription`, sin aplicar
- Prisma: el log de cada query pasa a ser opcional (`PRISMA_LOG_QUERIES=true`); por defecto solo `error` y `warn`
- Medical records service: historia clínica en `PatientBackground` — campos `dizziness`, `tinnitusTone`, `otoscopyRight`, `otoscopyLeft`, `createdAt`, `createdByUuid`, `updatedByUuid`; `GET/PUT /patients/:uuid/background` ahora comprueban que el paciente sea de la clínica (404 si no); acciones `CLINICAL_HISTORY_CREATED`/`CLINICAL_HISTORY_UPDATED`. Migración `20261021120000_add_clinical_history_fields`, sin aplicar

- Medical records service: audiometría marcada como "mal hecha" — `POST /patients/:patientUuid/audiometry-entries/:entryUuid/invalidate` con `{ reason }` (obligatorio, máximo 500 caracteres), definitiva (409 si ya está marcada), el payload no cambia. Lista y detalle devuelven `invalidatedAt`, `invalidatedByUuid`, `invalidatedByName` e `invalidationReason`. Migración `20261108140000_patient_audiometry_entry_invalidation`, aplicada solo en la base local de pruebas
- Identity service: nombre y logo de la clínica — `PATCH /tenants/current` acepta `name`; `POST` y `DELETE /tenants/current/logo` (PNG/JPG/WEBP/SVG, 2 MB, OWNER y ADMIN); `Tenant.logoKey` y `logoUrl` resuelto en `/auth/me` y `/tenants/current`. Migración `20261108150000_tenant_logo_key`
- Identity service: datos de contacto de la clínica — `Tenant.phone/email/address`, `GET` y `PATCH /tenants/current` (escritura solo OWNER y ADMIN); variables de plantilla `otoscopia_od/oi`, `diagnostico`, `observaciones` y `clinica_*`. Migración `20261108130000_tenant_contact_fields`
- Identity service: administración de usuarios por el OWNER — `POST /users`, `PATCH /users/:uuid` (con `role`), `PATCH /users/:uuid/status`, `PUT /users/:uuid/password`, `DELETE /users/:uuid` (desactiva) y `GET /users?status=`. Un INACTIVE no inicia sesión. Medical-records refresca la copia local del usuario cada 5 minutos. Sin migración (el enum `Status` ya existía)
- Identity service: corrección de la administración de usuarios — OWNER ya no es asignable, el actor se relee de la base, un OWNER no administra a otro, firma y foto solo del dueño con URL del bucket propio, correos en minúsculas, `limit` máximo 100 y default de `User.role` a STAFF. Migración `20261108160000_user_role_default_staff`

## 🔄 EN PROGRESO

_(nothing currently marked as in-progress in code)_

## 📋 PENDIENTE

### Alta prioridad

- **Delete appointment endpoint**: `DeleteAppointmentUseCase` is referenced but commented out in `AppointmentController` constructor and the `@Delete` route is commented out. The use case file likely doesn't exist yet.
- **FollowUp persistence**: `CreateMedicalControlUseCase` accepts `followUp` in the DTO and validates it, but the storage call is commented out (`// if (dto.followUp?.hasFollowUp) { ... }`). A FollowUp table/storage needs to be built.
- **RolesGuard wiring**: `RolesGuard` is exported from core but not used in any controller. Role-based access control is not enforced beyond having the `role` in the JWT.

### Decidido para más adelante (2026-10-22)
- **Permisos configurables por el administrador de cada clínica.** Roles fijos
  (`OWNER`, `ADMIN`, `DOCTOR`, `STAFF`) con permisos por defecto; el admin del
  tenant prende y apaga permisos por rol para su clínica. Los endpoints revisan
  **permisos**, nunca el rol suelto (hoy: `CLINICAL_ACCESS_ROLES` + `RolesGuard`,
  a reemplazar por la configuración del tenant). Cuidados: leer los permisos en
  cada request con cache corto (no en el JWT, o un cambio no aplica hasta
  reloguear); permisos que el admin no puede quitarse; aviso al dar acceso
  clínico a `STAFF` (Ley 8968); cada cambio en la bitácora; un permiso nuevo
  arranca con su valor por defecto sin migrar datos. Detalle en
  `audiocolors-backoffice/.claude/DECISIONS.md` D20.

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

## 2026-11-09: pedidos de la clínica (prioridad, laboratorio, Weber, equipos)

- `PUT /patients/:uuid/flags`: marcar prioridad exige `priorityReason` (400 si falta) y deja nota de Control de evolución; el paciente devuelve `priorityReason`, `prioritySince` y `priorityByName`.
- Envíos al laboratorio: enviar y recibir dejan nota de evolución con fecha de Costa Rica; corregir la fecha de un envío abierto no.
- Audiometría: Weber acepta `NO_RESPONSE`.
- Equipos de la clínica: `GET/POST /equipment`, `PATCH /equipment/:uuid`; `equipmentUuid` en la audiometría nueva y `equipment` en detalle e historial.
- Migración `20261109200000_priority_reason_and_equipment`.

## 2026-11-09: administración de sedes

- `GET/POST/PATCH /branches` para crear, editar, desactivar y reactivar sedes desde Configuración.
- Una sede desactivada no se ofrece para pacientes ni citas nuevos.

## 2026-11-09: código de negocio en los errores

- El filtro global de excepciones ahora devuelve `code` (primer nivel del cuerpo) cuando el error lo trae, p. ej. `EQUIPMENT_REQUIRED`, `EQUIPMENT_ALREADY_EXISTS`, `PATIENT_ALREADY_PRIORITY`. Solo se agrega el campo; el resto de la respuesta no cambia.
