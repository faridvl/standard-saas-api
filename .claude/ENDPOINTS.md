# Endpoints

**Auth header for protected routes:** `Authorization: Bearer <access_token>`

---

## Identity Service (port 7170)

### POST /auth/register
**Auth:** None  
**Body:**
```json
{
  "businessName": "string (required)",
  "businessType": "string (optional)",
  "ownerName": "string (required)",
  "email": "string (email)",
  "password": "string (min 8, 1 uppercase, 1 digit)"
}
```
**Response 201:**
```json
{
  "tenantUuid": "uuid",
  "userUuid": "uuid",
  "email": "string",
  "status": "ACTIVE"
}
```
**Status:** Implemented. Creates Tenant + User in a single transaction.

---

### POST /auth/login
**Auth:** None  
**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response 200:**
```json
{
  "access_token": "string (JWT)",
  "user": {
    "name": "string",
    "email": "string",
    "tenantUuid": "uuid"
  }
}
```
**Status:** Implemented.

---

### GET /auth/me
**Auth:** Required  
**Response 200:** Full user + tenant data (GetMeUseCase output).  
**Status:** Implemented.

---

### GET /auth/test
**Auth:** Required  
**Response 200:**
```json
{
  "message": "Tu token es válido y centralizado",
  "userUuid": "uuid",
  "email": "string",
  "tenant": "uuid",
  "fullData": { "sub": "...", "email": "...", "role": "...", "tenantId": N, "tenantUuid": "..." }
}
```
**Status:** Implemented (debug/test endpoint).

---

### GET /auth/health
**Auth:** None  
**Response 200:**
```json
{ "status": "ok", "timestamp": "ISO", "environment": "string", "message": "..." }
```
**Status:** Implemented.

---

### GET /health
**Auth:** None  
**Response 200:**
```json
{ "status": "ok", "timestamp": "ISO", "uptime": N, "memory": {...}, "message": "..." }
```
**Status:** Implemented (HealthController).

---

### POST /users
**Auth:** Required  
**Body:**
```json
{
  "email": "string (email)",
  "fullName": "string",
  "password": "string (min 8, uppercase, digit)",
  "role": "ADMIN | DOCTOR | STAFF | USER | MEDICO (default: ADMIN)",
  "specialty": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
**Response 201:** Created user domain object.  
**Status:** Implemented. Creates user under authenticated user's tenant.

---

### GET /users
**Auth:** Required  
**Query params:** `page` (default 1), `limit` (default 10)  
**Response 200:**
```json
{
  "data": [ { "uuid": "...", "email": "...", "fullName": "...", "role": "...", "tenantId": N, ... } ],
  "meta": { "total": N, "page": N, "limit": N, "totalPages": N }
}
```
**Status:** Implemented. Scoped to caller's tenant.

---

### GET /users/:uuid
**Auth:** Required  
**Response 200:** `UserDetail` — `{ uuid, fullName, email, role, specialty?, phoneNumber?, tenantId, createdAt }`  
**Status:** Implemented. Scoped to caller's tenant.

---

### PATCH /users/:uuid
**Auth:** Required  
**Body (all optional):**
```json
{
  "fullName": "string",
  "phoneNumber": "string",
  "specialty": "string"
}
```
**Response 200:** Updated user domain object.  
**Status:** Implemented. Email and role are not editable via this endpoint.

---

### DELETE /users/:uuid
**Auth:** Required  
**Response 204:** No content.  
**Status:** Implemented. Scoped to caller's tenant.

---

## Medical Records Service (port 7071)

### POST /patients
**Auth:** Required  
**Body:**
```json
{
  "firstName": "string (min 2)",
  "lastName": "string (min 2)",
  "phone": "string (optional)",
  "birthDate": "ISO date string (e.g. '1990-05-20')",
  "address": "string (optional)"
}
```
**Response 201:** Created patient object.  
**Status:** Implemented.

---

### GET /patients
**Auth:** Required  
**Query params:** `page` (default 1), `limit` (default 10)  
**Response 200:** `PaginatedResponse<Patient>`  
**Status:** Implemented. Scoped to tenant.

---

### GET /patients/:uuid
**Auth:** Required  
**Response 200:** Single patient object.  
**Status:** Implemented. Scoped to tenant.

---

### PATCH /patients/:uuid
**Auth:** Required  
**Body (all optional):**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "address": "string",
  "email": "string",
  "gender": "string",
  "bloodType": "string",
  "linkedProductUuid": "uuid | null"
}
```
**Response 200:** Updated patient object.  
**Status:** Implemented.

---

### POST /appointments
**Auth:** Required  
**Body:**
```json
{
  "patientUUID": "uuid",
  "typeUUID": "uuid (optional, nullable)",
  "speciality": "AUDIOLOGY | DENTAL | GENERAL",
  "status": "TENTATIVE | PENDING | CONFIRMED | WAITING | COMPLETED | CANCELLED | EXPIRED (default: PENDING)",
  "date": "ISO 8601 datetime",
  "startTime": "ISO 8601 datetime",
  "endTime": "ISO 8601 datetime",
  "notes": "string (max 500, optional)"
}
```
**Response 201:** Created appointment.  
**Status:** Implemented.

---

### GET /appointments
**Auth:** Required  
**Query params:** `page`, `limit`, `date` (ISO date filter), `patientId` (UUID filter)  
**Response 200:** Paginated appointments list.  
**Status:** Implemented.

---

### GET /appointments/:uuid
**Auth:** Required  
**Response 200:** Single appointment.  
**Status:** Implemented.

---

### GET /appointments/months
**Auth:** Required  
**Response 200:**
```json
{
  "months": ["2026-10", "2026-11", "2026-12"]
}
```
Meses (`YYYY-MM`, UTC), ordenados ascendente, que tienen al menos una cita con `status: CONFIRMED` y `startTime >= now()` para el tenant. Pensado para poblar un selector de filtro en el frontend sin listar meses sin citas. Mismo criterio que el filtro `nextAppointmentMonth` de `GET /patients`.  
**Status:** Implemented. Registrado antes de `GET /appointments/:uuid` en el controller para que NestJS no lo confunda con el parámetro de ruta.

---

### PATCH /appointments/:uuid
**Auth:** Required  
**Body (all optional):**
```json
{
  "status": "AppointmentStatus",
  "date": "ISO datetime",
  "startTime": "ISO datetime",
  "endTime": "ISO datetime",
  "notes": "string (max 500)"
}
```
**Response 200:** Updated appointment.  
**Status:** Implemented.

---

### GET /appointments/patient/:patientUUID
**Auth:** Required  
**Response 200:**
```json
{
  "patient": { "uuid": "...", "name": "..." },
  "appointments": [ ... ]
}
```
**Status:** Implemented.

---

### DELETE /appointments/:uuid
**Status:** COMMENTED OUT — `DeleteAppointmentUseCase` is imported but constructor entry is commented out in `appointments.controllers.ts`. Not functional.

---

### POST /medical-controls
**Auth:** Required  
**Body (AUDIOLOGY speciality):**
```json
{
  "header": {
    "patientUUID": "uuid",
    "appointmentUUID": "uuid (optional)",
    "encounterUuid": "uuid (optional, nullable)",
    "speciality": "AUDIOLOGY",
    "schemaVersion": 1
  },
  "clinicalData": {
    "findings": {
      "otoscopyRight": "string",
      "otoscopyLeft": "string",
      "cleaningPerformed": true,
      "usesAuxiliaries": false,
      "tinnitus": false
    },
    "diagnosis": "string"
  },
  "followUp": {
    "hasFollowUp": false,
    "tentativeDate": "ISO datetime (optional)",
    "notes": "string (optional)"
  }
}
```
**Body (GENERAL speciality):** Same structure but `findings` is free-form `Record<string, unknown>`.  
**Response 201:** Created medical control. `header.encounterUuid` echoes back what was sent (`null` if omitted).  
**Status:** Implemented. `encounterUuid` added 2026-07-27 — links this control to an `Encounter` (see Encounters section). Note: `followUp` storage is commented out — `followUp` data is accepted but not persisted.

---

### GET /medical-controls/patient/:patientUUID
**Auth:** Required  
**Query params:** `page` (default 1), `limit` (default 10)  
**Response 200:** Paginated medical controls for patient.  
**Status:** Implemented.

---

### GET /medical-controls/:uuid
**Auth:** Required  
**Response 200:** Single medical control.  
**Status:** Implemented.

---

### POST /products
**Auth:** Required  
**Body:**
```json
{
  "sku": "string (min 3)",
  "name": "string (min 2)",
  "model": "string (optional)",
  "description": "string (optional)",
  "price": "number (min 0)",
  "stock": {
    "current": "number (default 0)",
    "min": "number (default 5)"
  },
  "cabysCode": "string (optional)",
  "isActive": "boolean (default true)"
}
```
**Response 201:** Created product.  
**Status:** Implemented.

---

### GET /products
**Auth:** Required  
**Query params:** `includeInactive=true` (to include soft-deleted)  
**Response 200:** Array of products (default: only active).  
**Status:** Implemented.

---

### GET /products/:uuid
**Auth:** Required  
**Response 200:** Single product detail.  
**Status:** Implemented.

---

### PATCH /products/:uuid
**Auth:** Required  
**Body:** Partial `ProductDto` (same fields as POST, all optional).  
**Response 200:** Updated product.  
**Status:** Implemented.

---

### DELETE /products/:uuid
**Auth:** Required  
**Response 200:** Soft-deletes (sets `isActive = false`).  
**Status:** Implemented.

---

## Patient Documents & Notes (Medical Records Service, port 7071)

`GET`/`POST` en `/patients/:patientUuid/documents` y `/patients/:patientUuid/notes`
devuelven cada item con `uploadedByName` (documentos) / `authorName` (notas):
el nombre completo de quien lo creó, resuelto contra identity vía un cache
local (tabla `User` en la base de medical-records, ver DATABASE.md). Es
`null` si identity no responde o `IDENTITY_SERVICE_URL` no está configurada
— no bloquea la operación principal.

---

## Encounters (Medical Records Service, port 7071)

Modela el `Encuentro` (visita del paciente) como entidad persistente — reemplaza
`consulta-session.ts` en `sessionStorage` del site. Ver `.claude/DOMAIN_ANALYSIS.md`
(site repo) §4.1. Cita ≠ Encuentro: `appointmentUuid` es nullable porque hay
encuentros sin cita (walk-in) y citas sin encuentro (no asistió).

`MedicalControl` y `Maintenance` ahora tienen `encounterUuid` nullable (transición
gradual, no rompe registros existentes). Ninguno de los dos storages expone un
`update` destructivo sobre datos clínicos: `MedicalControlStorage.addCorrectionNote`
solo añade al campo `correctionNotes` (nunca reescribe `findings`/`diagnosis`), y
`MaintenanceStorage` es create-only. El patrón append-only (NOM-004 5.11) ya se
cumple sin cambios adicionales.

**2026-07-27 — `encounterUuid` expuesto en creación:** `POST /medical-controls`
acepta `header.encounterUuid` (uuid, opcional/nullable — ver ejemplo de body más
arriba). `POST /maintenance` acepta `encounterUuid` (uuid, opcional/nullable) como
campo de nivel superior del body, junto a `patientUuid`/`description`/
`nextMaintenanceAt`/`deviceUuid`. Antes de este cambio la columna existía en DB
pero ningún DTO/use-case/storage la aceptaba en create — quedaba siempre `null`.

**Acceso:** igual que `medical-controls` — rol `STAFF` recibe 403 en todas las rutas
(datos de salud sensibles, Ley 8968). La especialidad determina qué se puede crear,
nunca qué se puede ver (NOM-004 5.14).

### POST /encounters
**Auth:** Required (403 si `role === STAFF`)
**Body:**
```json
{
  "patientUuid": "uuid",
  "especialidad": "string (min 1)",
  "appointmentUuid": "uuid (optional, nullable)"
}
```
**Response 201:**
```json
{
  "uuid": "uuid",
  "patientUuid": "uuid",
  "tenantUuid": "uuid",
  "autorUuid": "uuid",
  "especialidad": "string",
  "appointmentUuid": "uuid | null",
  "startedAt": "ISO datetime",
  "closedAt": null,
  "status": "OPEN"
}
```
**Status:** Implemented. `autorUuid` se toma del JWT (`user.sub`), no del body.

---

### GET /encounters/patient/:uuid
**Auth:** Required (403 si `role === STAFF`)
**Response 200:** Array de `EncounterEntity`, ordenado por `startedAt desc`. Sin
paginar (para el timeline del expediente). Sin filtro por especialidad — expediente
único por paciente (NOM-004 5.14).
**Status:** Implemented.

---

### GET /encounters/:uuid
**Auth:** Required (403 si `role === STAFF`)
**Response 200:** `EncounterEntity` + `medicalControls: MedicalControl[]` +
`maintenances: Maintenance[]` + `studies: Study[]` (los registros clínicos colgados
de este encuentro).
**Response 404:** Si el UUID no existe o no pertenece al tenant.
**Status:** Implemented. `studies` agregado 2026-07-27 (ver sección Studies).

---

### PATCH /encounters/:uuid/close
**Auth:** Required (403 si `role === STAFF`)
**Body:** Ninguno.
**Response 200:** `EncounterEntity` con `status: "CLOSED"` y `closedAt` seteado.
**Status:** Implemented. Append-only: si el encuentro ya está `CLOSED`, devuelve el
registro sin modificarlo (no hay update posterior a un encuentro cerrado). Reabrir
un encuentro significa crear uno nuevo vinculado — no existe endpoint para reabrir.

---

## Studies (Medical Records Service, port 7071)

**Concepto:** un `Study` es una MEDICIÓN estructurada (audiometría, test
psicométrico...), no una nota de evolución. Antes se guardaba disfrazado de
`MedicalControl` (`diagnosis: "Audiograma"`, `findings.audiogram`). Ahora es su
propia entidad: repetible y comparable en el tiempo, colgada de un `Encounter`.

`Study` es **inmutable** (append-only, NOM-004 5.11) — no existe `PATCH`/`PUT`.
Repetir una medición crea un `Study` nuevo; el anterior no se toca ni se borra.

### POST /studies
**Auth:** Required (403 si `role === STAFF`)
**Body:**
```json
{
  "encounterUuid": "uuid",
  "patientUuid": "uuid",
  "tipo": "AUDIOMETRIA_TONAL | TEST_PSICOMETRICO",
  "payload": { "...": "estructura libre según tipo, ver nota abajo" },
  "documentUuid": "uuid (optional, nullable) — archivo del equipo adjunto, si lo hay"
}
```
**Payload para `AUDIOMETRIA_TONAL`** (forma que persiste el site):
```json
{ "OD": { "125": "20", "250": "15" }, "OI": { "125": "25" } }
```
Anidado por oído, claves = frecuencia en Hz (string), valores = umbral en dB HL
(string). Misma forma que antes vivía en `MedicalControl.findings.audiogram`.
**Response 201:**
```json
{
  "uuid": "uuid",
  "encounterUuid": "uuid",
  "patientUuid": "uuid",
  "tenantUuid": "uuid",
  "autorUuid": "uuid",
  "tipo": "AUDIOMETRIA_TONAL",
  "payload": { "...": "..." },
  "documentUuid": "uuid | null",
  "createdAt": "ISO datetime"
}
```
**Status:** Implemented. `autorUuid` se toma del JWT (`user.sub`), no del body.

---

### GET /studies/patient/:uuid
**Auth:** Required (403 si `role === STAFF`)
**Response 200:** Array de `StudyEntity`, ordenado por `createdAt desc`. Sin
paginar. Sin filtro por especialidad — expediente único por paciente (NOM-004
5.14).
**Status:** Implemented.

---

### GET /studies/:uuid
**Auth:** Required (403 si `role === STAFF`)
**Response 200:** `StudyEntity`.
**Response 404:** Si el UUID no existe o no pertenece al tenant.
**Status:** Implemented.

---

## Clinical Templates (Medical Records Service, port 7071)

### GET /clinical-templates
**Auth:** Required  
**Response 200:** Array of clinical templates for the tenant.  
**Status:** Implemented.

---

### GET /clinical-templates/speciality/:speciality
**Auth:** Required  
**Param:** `speciality` — `AUDIOLOGY | DENTAL | GENERAL`  
**Response 200:** Array of templates filtered by speciality.  
**Status:** Implemented.

---

### POST /clinical-templates
**Auth:** Required  
**Body:**
```json
{
  "name": "string",
  "speciality": "AUDIOLOGY | DENTAL | GENERAL",
  "fields": [ { "key": "string", "label": "string", "type": "string" } ]
}
```
**Response 201:** Created clinical template.  
**Status:** Implemented.

---

### PATCH /clinical-templates/:uuid
**Auth:** Required  
**Body:** Partial — same fields as POST, all optional.  
**Response 200:** Updated clinical template.  
**Status:** Implemented.

---

### DELETE /clinical-templates/:uuid
**Auth:** Required  
**Response 204:** No content.  
**Status:** Implemented.
