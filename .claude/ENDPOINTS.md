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
  "birthDate": "ISO date string (optional, not future; e.g. '1990-05-20')",
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
Pasar `status` a `WAITING` (llegó) o `COMPLETED` (atendido) anota
`APPOINTMENT_ARRIVED` / `APPOINTMENT_COMPLETED` en la bitácora del paciente,
solo si el estado cambia. Volver a `CONFIRMED` no se anota.  
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

**Acceso:** `/patients/:patientUuid/notes` (Control de evolución) responde 403 al rol
`STAFF`; los documentos sí los ve y sube.

**404** en `POST /patients/:patientUuid/notes` si el paciente no existe en la clínica de la sesión (antes creaba la nota sobre un paciente de otra clínica).

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
**Auth:** Required. Con `speciality = CLINICAL_HISTORY`, crear, cambiar o borrar responde 403 al rol `STAFF` (lo pueden hacer `OWNER`, `ADMIN` y `DOCTOR`).  
**Body:** Partial — same fields as POST, all optional.  
**Response 200:** Updated clinical template.  
**Status:** Implemented.

---

### DELETE /clinical-templates/:uuid
**Auth:** Required  
**Response 204:** No content.  
**Status:** Implemented.


---

## Patient Activity (Medical Records Service, port 7071)

Bitácora de lo que el personal hace con cada paciente. Solo lectura: las
filas las escriben los propios casos de uso (alta, `PATCH /patients/:uuid`,
contactos, notas, documentos, próxima cita). Append-only; arranca vacía, sin
historial reconstruido. Registrar una acción nunca hace fallar la operación
original (si falla, queda un warning en el log).

`action` es uno de:
`PATIENT_CREATED | PATIENT_UPDATED | CONTACT_ADDED | CONTACT_UPDATED | CONTACT_REMOVED | NOTE_ADDED | DOCUMENT_UPLOADED | DOCUMENT_RENAMED | DOCUMENT_CATEGORY_CHANGED | DOCUMENT_DELETED | APPOINTMENT_TENTATIVE | APPOINTMENT_CONFIRMED | APPOINTMENT_ARRIVED | APPOINTMENT_COMPLETED | STATUS_CHANGED | HEARING_AIDS_LAB_CHANGED | WARRANTY_CHANGED | VIDEO_CANDIDATE_CHANGED | WARRANTY_EXPIRED_CHANGED | RENEW_PRESCRIPTION_CHANGED | CLINICAL_HISTORY_CREATED | CLINICAL_HISTORY_UPDATED`

`detail` según la acción:

| action | detail |
|---|---|
| PATIENT_CREATED | `null` |
| PATIENT_UPDATED | `{ changes: [{ field, before, after }] }` — solo campos que cambiaron (`firstName, lastName, documentId, phone, email, address, gender, bloodType, occupation, branchUuid`); sin cambios no se registra |
| CONTACT_ADDED / CONTACT_REMOVED | `{ name, phone }` |
| CONTACT_UPDATED | `{ name, phone, before: { name, phone } }` |
| NOTE_ADDED | `{ category, excerpt }` (primeros 120 caracteres) |
| DOCUMENT_UPLOADED / DOCUMENT_DELETED | `{ documentUuid, originalName, category }` |
| DOCUMENT_RENAMED | `{ documentUuid, before, after }` |
| DOCUMENT_CATEGORY_CHANGED | `{ documentUuid, before, after }` — `before`/`after` son `DocumentCategory` |
| APPOINTMENT_TENTATIVE | `{ month: "YYYY-MM", typeUuid, typeName }` — limpiar el mes no se registra |
| APPOINTMENT_CONFIRMED | `{ appointmentUuid, date: "YYYY-MM-DD", typeUuid, typeName }` |
| APPOINTMENT_ARRIVED / APPOINTMENT_COMPLETED | `{ appointmentUuid, date: "YYYY-MM-DD", typeUuid, typeName }` — `PATCH /appointments/:uuid` con `status` `WAITING` o `COMPLETED` (solo si el estado cambia) |
| STATUS_CHANGED | `{ before, after, reason, date }` — estados `ACTIVE/INACTIVE/DECEASED`; `date` = fecha de fallecimiento `YYYY-MM-DD` o `null` |
| HEARING_AIDS_LAB_CHANGED / WARRANTY_CHANGED / VIDEO_CANDIDATE_CHANGED / WARRANTY_EXPIRED_CHANGED / RENEW_PRESCRIPTION_CHANGED | `{ isOn }` — solo si el indicador cambió |
| CLINICAL_HISTORY_CREATED / CLINICAL_HISTORY_UPDATED | `null` — `PUT /patients/:uuid/background`: CREATED si el paciente no tenía antecedentes, UPDATED si ya tenía |

`typeName` y `patientName` son copias al momento de la acción.

### GET /patient-activity
**Auth:** Required. 403 para el rol `STAFF` en `/patient-activity`, `/months` y `/summary`; `/actors` queda abierto (solo nombres, lo usa la agenda).  
**Query:**
- `page` (default `1`), `limit` (default `20`, máx `100`)
- `actorUuid` — solo acciones de ese usuario
- `action` — una o varias separadas por coma (`APPOINTMENT_TENTATIVE,APPOINTMENT_CONFIRMED`); 400 si alguna no existe
- `from`, `to` — ISO 8601; filtra `createdAt >= from` y `< to`. El cliente arma el rango en su zona horaria
- `search` — nombre del paciente (copia guardada) o cédula actual
- `branchUuid` — pacientes que tienen esa sede entre todas las suyas (no solo la principal)
- `appointmentTypeUuid` — `detail.typeUuid` (solo acciones de cita lo tienen)

**Response 200:** `PaginatedResponse`, orden `createdAt` desc:
```json
{
  "data": [
    {
      "uuid": "string",
      "patientUuid": "string",
      "patientName": "string",
      "patientBranchUuid": "string | null",
      "actorUuid": "string",
      "actorName": "string | null",
      "action": "NOTE_ADDED",
      "detail": { "category": "EVOLUTION_CONTROL", "excerpt": "string" },
      "createdAt": "ISO"
    }
  ],
  "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
}
```
`patientBranchUuid` es la sede actual del paciente.  
**Status:** Implemented.

---

### GET /patient-activity/actors
**Auth:** Required  
**Response 200:** Usuarios con al menos una acción en el tenant, ordenados por nombre:
```json
[{ "uuid": "string", "fullName": "string | null" }]
```
**Status:** Implemented.

---

### GET /patient-activity/months
**Auth:** Required  
**Query:** `timeZone` — IANA (p. ej. `America/Costa_Rica`), opcional, default `UTC`; 400 si no es válida  
**Response 200:** Meses `YYYY-MM` con al menos una acción, del más reciente al más antiguo, agrupados en esa zona horaria:
```json
{ "months": ["2026-09"] }
```
**Status:** Implemented.

---

### GET /patient-activity/summary
**Auth:** Required  
**Query:** `from`, `to` (ISO 8601, opcionales)  
**Response 200:**
```json
{
  "total": 0,
  "byAction": { "APPOINTMENT_CONFIRMED": 0 },
  "byActor": [{ "actorUuid": "string", "actorName": "string | null", "count": 0 }]
}
```
**Status:** Implemented.


---

## Patient Status (Medical Records Service, port 7071)

Estado del paciente para la clínica, independiente del borrado lógico
(`isActive`/`deletedAt`, que sigue significando "registro eliminado").
Campos nuevos en `Patient`: `status` (`ACTIVE | INACTIVE | DECEASED`, default
`ACTIVE`), `statusReason`, `statusDate`, `statusChangedAt`. Los pacientes
existentes quedan `ACTIVE`.

### PUT /patients/:uuid/status
**Auth:** Required
**Body:**
```json
{ "status": "ACTIVE | INACTIVE | DECEASED", "reason": "string | null (opcional, máx 200)", "date": "YYYY-MM-DD | null (opcional, solo DECEASED)" }
```
- `reason` se descarta si `status` es `ACTIVE`; `date` se descarta si no es `DECEASED`.
- Al pasar a `DECEASED` se cancelan sus citas `CONFIRMED` futuras y se limpia el mes tentativo, en una transacción.
- Registra `STATUS_CHANGED` en la bitácora si algo cambió.

**Response 200:** `Patient` actualizado.
**Status:** Implemented.

### Reglas relacionadas
- `POST /patients/:uuid/next-appointment` y `PUT /patients/:uuid/next-appointment/tentative-month` (con mes) responden **400** si el paciente está `DECEASED`.

### GET /patients — filtros nuevos
- `status` — uno o varios separados por coma (`ACTIVE,INACTIVE`); 400 si alguno no existe. Sin el parámetro no filtra (compatibilidad con Zynka).
- `branchUuid` — una o varias sedes separadas por coma: devuelve al paciente que esté en cualquiera de ellas, una sola vez. Busca en todas las sedes del paciente, no solo en la principal. El total y la paginación cuentan pacientes, no filas.
- `appointmentTypeUuid` — tipo de la **próxima cita**: la CONFIRMED futura más cercana, o el tipo del mes tentativo.

Se combinan entre sí y con `search` y `nextAppointmentMonth`.

Indicadores (`=true` filtra por los que lo tienen prendido; otro valor o ausente no filtra):
`hearingAidsInLab`, `hasActiveWarranty`, `isVideoCandidate`, `warrantyExpired`, `renewPrescription`, `isPriority`.
`isPriority=true` solo filtra (deja los marcados como prioritarios); no cambia el orden de la lista.

`hearingAidsInLabDate` (`YYYY-MM-DD`, día de Costa Rica): solo con `hearingAidsInLab=true`; deja a los pacientes con un envío **abierto** (`deliveredAt` nulo) cuyo `sentAt` cae en ese día. Sin `hearingAidsInLab=true` se ignora. Fecha inválida: **400** "hearingAidsInLabDate debe ser un día válido (AAAA-MM-DD)".

### Sedes del paciente (`branchUuids`)
Un paciente tiene una o más sedes (tabla `PatientBranch`). `branchUuid` se conserva como la sede **principal** (la primera de la lista).
- `POST /patients` y `PATCH /patients/:uuid` aceptan `branchUuids` (uuid, sin repetidos). Lectura (`GET /patients/:uuid`) y lista devuelven `branchUuids` además de `branchUuid`, con la principal primero.
- Solo `branchUuid` (clientes viejos, que solo conocen la principal): reemplaza la principal (la anterior sale) y conserva las demás; `null` saca solo la principal y, si quedan otras, la primera pasa a principal. Solo `branchUuids`: la principal actual se conserva si sigue en la lista, si no pasa a ser la primera; `[]` limpia todo y deja `branchUuid` en `null`.
- **400** si `branchUuid` y `branchUuids` no concuerdan, si hay repetidos, o si alguna sede no existe o es de otra clínica. La escritura va en una transacción.
- `POST /appointments`, `POST /patients/:uuid/next-appointment` y `PATCH /appointments/:uuid` (solo cuando la sede cambia): **404** si el paciente no existe en la clínica, o si el `typeUUID` no es de la clínica (`POST /appointments` lo valida siempre, también sin `branchUUID`); **400** si la `branchUUID` no existe en la clínica (se valida siempre, también con un paciente sin sedes) o no está entre las sedes del paciente. Un paciente sin sedes puede agendar en cualquiera de la clínica. Excepción al reagendar con `next-appointment`: se acepta la sede de su cita futura vigente aunque el paciente ya no la tenga.
- `GET /patients/:uuid` y `GET /patients` devuelven `nextAppointmentBranchUuid`: uuid de la sede de la próxima cita `CONFIRMED` futura más cercana (la misma de `nextAppointmentAt`), o `null` si no hay cita o se agendó sin sede.
- Bitácora: si cambian las sedes, `PATIENT_UPDATED` trae los cambios `branchUuid` y `branchUuids` (las secundarias se comparan sin importar el orden).

### PUT /patients/:uuid/flags
**Body (al menos uno):**
```json
{ "hearingAidsInLab": "boolean?", "hearingAidsInLabDate": "YYYY-MM-DD?", "shipmentUuid": "uuid?", "hasActiveWarranty": "boolean?", "isVideoCandidate": "boolean?", "warrantyExpired": "boolean?", "renewPrescription": "boolean?", "isPriority": "boolean?" }
```
Cada indicador se guarda como "desde cuándo" en el paciente (`null` = apagado):
`hearingAidsInLabSince`, `warrantyActiveSince`, `videoCandidateSince`,
`warrantyExpiredSince`, `renewPrescriptionSince`, `prioritySince`. Solo los que cambian se anotan
en la bitácora. **Response 200:** `Patient`.
Migración `20261020120000_add_warranty_expired_renew_prescription`.

**Audífonos en laboratorio (historial de envíos).** Prender `hearingAidsInLab` abre un envío con ese `sentAt` (`hearingAidsInLabDate`, un día `YYYY-MM-DD`; por defecto hoy); cambiar la fecha mientras sigue en laboratorio corrige el `sentAt` del envío abierto. Para corregir se manda además `shipmentUuid` (uuid del envío que la pantalla muestra; exige `hearingAidsInLabDate`): si ese envío ya no es el abierto, **409** "Este envío ya fue entregado. Recarga la página.". Sin `shipmentUuid` y con el interruptor apagado, prender abre un envío nuevo. **400** si el `sentAt` (al abrir o corregir) es anterior a la entrega del último envío cerrado ("La fecha de envío no puede ser anterior a la última entrega (DD/MM/AAAA)"). Apagarlo es la entrega y acepta, solo con `hearingAidsInLab: false` (con otro valor: 400):
```json
{ "hearingAidsInLab": false, "deliveredAt": "YYYY-MM-DD ?", "note": "string (máx. 1000) ?" }
```
`deliveredAt` por defecto es hoy (Costa Rica); **400** si es posterior a hoy ("La fecha de entrega no puede ser posterior a hoy") o anterior al día de envío del abierto ("La fecha de entrega no puede ser anterior a la de envío (DD/MM/AAAA)"). Todo ocurre en una transacción con el paciente bloqueado: cierra el envío (`deliveredAt`, `note`, `deliveredByUuid`), apaga el switch y, si hay `note`, crea además una nota de Control de evolución (`EVOLUTION_CONTROL`) con el mismo texto, mismo autor y fecha de hoy. Sin envío abierto (dato viejo) crea uno ya cerrado con `sentAt` = el día que tenía el interruptor (`hearingAidsInLabSince`), o `deliveredAt` si no lo tenía; la misma regla de que la entrega no sea antes del envío. Un envío abierto por paciente como máximo (índice parcial único). Con `deliveredAt` o `note` y el interruptor ya apagado: **409** "Los audífonos ya se marcaron como entregados.". Con `note` y un rol fuera de OWNER, ADMIN y DOCTOR (p. ej. STAFF): **403** "Solo el personal clínico puede agregar notas."; entregar sin nota sí lo puede hacer cualquier rol (el endpoint no lleva `RolesGuard`). Bitácora, dentro de la misma transacción (si algo falla no queda evento): `HEARING_AIDS_DELIVERED` con `{ date, hasNote }` (sin el texto) y, si hubo nota, `NOTE_ADDED`.

Prioridad: `isPriority: true` guarda `prioritySince` (ahora); `false` lo deja en `null`. Bitácora: `PRIORITY_CHANGED` con `{ isOn }`. `prioritySince` viene en el detalle y en la lista. Un paciente de otra clínica responde **404**.

### GET /patients/stale
Pacientes sin movimiento: el último movimiento es de hace 6 meses o más. Movimiento = cualquier evento de la bitácora (`PatientActivity`); sin actividad cuenta la fecha de creación. Excluye archivados, inactivos (`status` distinto de ACTIVE) y eliminados. Mismos permisos que `GET /patients`; aislado por la clínica del JWT. Una sola consulta.
**Response 200**, del más antiguo al más reciente:
```json
[{ "uuid": "uuid", "fullName": "Nombre Apellido", "lastMovementAt": "ISO-8601" }]
```
Migración `20261107120000_patient_priority_and_activity_index`.

### GET /patients/:patientUuid/lab-shipments
`AuthGuard` (sin `RolesGuard`), filtrado por `tenantUuid` (paciente de otro negocio o borrado: **404** "Paciente no encontrado"). Solo lee: los nombres salen de la copia local de usuarios, sin crearla. `note` llega `null` a los roles fuera de OWNER, ADMIN y DOCTOR. **Response 200**, del más reciente al más viejo:
```json
[{ "uuid": "", "sentAt": "YYYY-MM-DD", "deliveredAt": "YYYY-MM-DD | null", "note": "string | null", "createdByUuid": "string | null", "createdByName": "string | null", "deliveredByUuid": "string | null", "deliveredByName": "string | null" }]
```
`uuid` es el que se manda como `shipmentUuid` al corregir. `deliveredAt: null` = sigue en laboratorio. Los nombres pueden ser `null` (envío migrado sin autor o usuario sin copia local). Migración `20261102180000_patient_lab_shipments` (copia como envío abierto a quien ya tenía el switch prendido).

### Mantenimientos del paciente (estado e historial de notas)
Mantenimiento 1 a 4 del paciente (4 gratis al entregar audífonos, uno cada 6 meses): un
estado y un historial de notas que el personal maneja a mano; no se calculan desde las
citas. Solo `AuthGuard` (cualquier rol de la clínica). `:number` solo acepta 1, 2, 3 o 4;
otro valor: **400**. Un paciente de otra clínica o borrado responde **404**
`"Paciente no encontrado"`.

**PUT /patients/:uuid/maintenances/:number** - Body:
```json
{ "status": "UNMARKED | ATTENDED | MISSED" }
```
Guarda `maintenance1Status` ... `maintenance4Status` (por defecto `UNMARKED`). **Response
200:** `Patient`. Si el estado es el mismo no escribe ni anota en la bitácora. Bitácora:
`MAINTENANCE_CHANGED` con `{ number, status, previousStatus }`. **400** si `status` no es
uno de los tres valores.

**POST /patients/:uuid/maintenances/:number/notes** - Body `{ "text": "string (1-500, recortado)" }`.
**Response 201:** `{ uuid, text, createdAt, createdByUuid, createdByName }`. Las notas no se
editan ni se borran. Bitácora: `MAINTENANCE_NOTE_ADDED` con `{ number }` (sin el texto).
**400** si el texto queda vacío o pasa de 500.

**GET /patients/:uuid/maintenances** - **Response 200:**
```json
[{ "number": 1, "status": "ATTENDED", "notes": [{ "uuid": "", "text": "", "createdAt": "", "createdByUuid": "", "createdByName": "" }] }]
```
Siempre los 4 mantenimientos; las notas de la más nueva a la más vieja
(`createdByUuid`/`createdByName` pueden ser `null`).

`GET /patients/:uuid` y la lista de pacientes devuelven `maintenance1Status` ...
`maintenance4Status`; ya no salen `done` ni `note`. Las columnas `maintenanceNDone` y
`maintenanceNNote` siguen en la base sin uso (Prisma las omite). Migración
`20261101170000_patient_maintenance_status_and_notes`: `done = true` pasa a `ATTENDED` y
cada nota vieja pasa a la primera nota del historial (los "Perdido" de antes quedan como
`UNMARKED` con esa nota, no como `MISSED`). Los eventos `MAINTENANCE_CHECK_CHANGED` y
`MAINTENANCE_NOTE_CHANGED` son históricos y se siguen leyendo.
El endpoint `PUT /patients/:uuid/contact-attempts` y la columna `contactAttempts` se
retiraron: lo de "se llamó" va en una nota.

### PATCH /patients/:uuid — documento de garantía
Acepta además `warrantyDocumentUuid: uuid | null` (null lo quita). Debe ser un
documento de ese paciente y de la clínica; si no, **400**
`"El documento de garantía no existe en el expediente"`. El `Patient` devuelto
incluye `warrantyDocumentUuid`. Al borrar ese documento
(`DELETE /patients/:uuid/documents/:documentUuid`) el campo vuelve a `null`.

### PATCH /patients/:patientUuid/documents/:documentUuid
**Body (al menos uno):**
```json
{ "originalName": "string (1-255)?", "category": "EVOLUTION_CONTROL | WARRANTY | EXTERNAL_TEST | CLINICAL_HISTORY | OTHER ?" }
```
**Response 200:** `PatientDocument` actualizado. **404** si el documento no es
de la clínica. Bitácora: `DOCUMENT_RENAMED` si cambió el nombre y
`DOCUMENT_CATEGORY_CHANGED` si cambió la sección.

## Historia clínica / antecedentes (Medical Records Service, port 7071)

STAFF recibe **403**. Si el paciente no existe en la clínica del usuario
(`tenantUuid` del JWT): **404** `"Paciente no encontrado"`.

### GET /patients/:uuid/background
**Response 200:** `PatientBackground | null` (null si el paciente no tiene antecedentes).

### PUT /patients/:uuid/background
Crea o reemplaza los antecedentes. **Body:**
```json
{
  "earInfections": "boolean (default false)", "nasalSurgery": "boolean", "throatSurgery": "boolean",
  "earSurgery": "boolean", "diabetes": "boolean", "cholesterol": "boolean", "highPressure": "boolean",
  "allergies": "boolean", "rhinitis": "boolean", "vertigo": "boolean", "tinnitus": "boolean",
  "headacheNoise": "boolean", "cloggedEar": "boolean",
  "dizziness": "boolean (default false) — mareo, distinto de vertigo",
  "tinnitusTone": "string (máx. 120) | null ?",
  "otoscopyRight": "string (máx. 1000) | null ?",
  "otoscopyLeft": "string (máx. 1000) | null ?",
  "notes": "string | null ?"
}
```
Todos los booleanos tienen default `false`. `tinnitusTone`, `otoscopyRight` y
`otoscopyLeft` se guardan recortados; vacío pasa a `null`. Más largo que el
máximo → **400** `"Máximo N caracteres"`.

**Response 200 (GET y PUT):**
```json
{
  "uuid": "string", "patientUuid": "string",
  "earInfections": false, "nasalSurgery": false, "throatSurgery": false, "earSurgery": false,
  "diabetes": false, "cholesterol": false, "highPressure": false, "allergies": false,
  "rhinitis": false, "vertigo": false, "tinnitus": false, "headacheNoise": false,
  "cloggedEar": false, "dizziness": false,
  "tinnitusTone": "string | null", "otoscopyRight": "string | null", "otoscopyLeft": "string | null",
  "notes": "string | null",
  "createdAt": "ISO", "updatedAt": "ISO",
  "createdByUuid": "string | null", "updatedByUuid": "string | null"
}
```
`createdByUuid`/`updatedByUuid` son el `sub` del JWT de quien la llenó y de quien
la modificó por última vez (null en antecedentes anteriores a la migración).
Bitácora: `CLINICAL_HISTORY_CREATED` o `CLINICAL_HISTORY_UPDATED`.
Migración `20261021120000_add_clinical_history_fields`.

---

## Calendar Feed (Medical Records Service, port 7071)

Calendario suscrito (webcal) para que las citas aparezcan solas en el
calendario del teléfono (iPhone, Outlook, Google). Un enlace por usuario; la app
de calendario no puede iniciar sesión, así que un token secreto en el enlace
hace de llave. Tabla `CalendarFeed` (migración `20260930120000_add_calendar_feed`).

Un **calendario** es una sede, o una sede y un tipo de cita. Su clave es
`"<sede>"` o `"<sede>:<tipo>"` (`buildCalendarKey`).

### GET /calendar-feed
**Auth:** Bearer. **Response 200:**
```json
{
  "token": "string | null",
  "removedCalendarKeys": ["<sede>", "<sede>:<tipo>"],
  "fetchedCalendars": { "<sede>[:<tipo>]": "ISO de la última vez que el teléfono lo pidió" }
}
```
`token` es `null` si el usuario no tiene calendario conectado. `fetchedCalendars` es lo que permite saber qué calendarios ya agregó al teléfono: el servidor no tiene otra forma de saberlo.
**Status:** Implemented.

### POST /calendar-feed
**Auth:** Bearer. **Body:** vacío. Crea el enlace del usuario; **si ya tiene uno lo devuelve sin cambiarlo** (cambiar el token dejaría sin citas a todo lo que ya agregó al teléfono).
**Response 201:** igual que `GET /calendar-feed` (token de 32 caracteres base64url).
**Status:** Implemented.

### PATCH /calendar-feed/calendars
**Auth:** Bearer. **Body:** `{ "branchUuid": uuid, "typeUuid"?: uuid | null, "isRemoved": boolean }`.
`isRemoved: true` quita el calendario: el `.ics` pasa a responder **vacío** (con su nombre). El servidor no puede borrar la suscripción del teléfono; queda en el iPhone sin citas. `false` lo vuelve a mostrar.
**Response 200:** igual que `GET /calendar-feed`. **404** si el usuario no tiene calendario, o la sede o el tipo no son de su clínica. **400** si el body es inválido.
Columnas `removedCalendarKeys` y `fetchedCalendars` (migración `20261009120000_calendar_feed_calendar_keys`).
**Status:** Implemented.

### DELETE /calendar-feed
**Auth:** Bearer. Desconecta el calendario del usuario.
**Response 200:** `{ "success": true }`.
**Status:** Implemented.

### GET /calendar-feed/:token.ics
**Auth:** ninguna (público; el token es la llave).
**Query:**
- `branch` (uuid, opcional) — solo las citas de esa sede; el calendario se llama `Citas · <sede>`.
- `type` (uuid, opcional, solo junto a `branch`) — además, solo las de ese tipo; el calendario se llama `<sede> · <tipo>`.
- `color` (`#rrggbb`, opcional) — color del calendario (`X-APPLE-CALENDAR-COLOR`). El iPhone colorea calendarios enteros, no eventos: por eso el back-office ofrece un enlace por calendario, cada uno con su color.

Una sede o un tipo de otra clínica, o un calendario quitado, devuelven el calendario vacío. Cada consulta con `branch` anota la hora en `fetchedCalendars`; si eso falla, el calendario se responde igual.

**Response 200:** `text/calendar; charset=utf-8` (iCalendar, RFC 5545).
- Citas de la clínica del dueño del token, de 30 días atrás a 365 adelante, sin `CANCELLED` ni `TENTATIVE`.
- `SUMMARY`: `<nombre completo del paciente>`, más ` · <tipo>` si el calendario no es de un tipo y ` · <sede>` si no es de una sede. **Lleva el nombre completo por decisión de la clínica**, aunque el calendario vive en teléfonos personales.
- Cita a las 08:00:00 UTC exactas (`DEFAULT_APPOINTMENT_HOUR_UTC`, "solo día") → evento de día completo.
- `UID` estable (`<uuid de la cita>@standard-saas.com`): el teléfono actualiza en vez de duplicar.
- `REFRESH-INTERVAL` y `X-PUBLISHED-TTL`: 15 minutos (sugerencia; cada app decide).

Un token que no existe (revocado o inventado) responde **200 con un calendario vacío**, no 404: así el teléfono borra las citas que tenía.
**Status:** Implemented.

---

## Historial de audiometrías (Medical Records Service, port 7071)

**Acceso:** solo roles clínicos (`OWNER`, `ADMIN`, `DOCTOR`); `STAFF` recibe 403. Todo se filtra por el `tenantUuid` del token: un paciente o registro de otro negocio (o de otro paciente) responde 404. Cada guardado es un registro inmutable: no hay edición ni borrado; lo único que cambia es la marca definitiva de "mal hecha" (abajo), que nunca toca el payload. El autor sale del token, nunca del body. No se guarda PDF: el front lo regenera al imprimir desde estos datos.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/patients/:patientUuid/audiometry-entries` | Historial resumido, el más reciente primero |
| `GET` | `/patients/:patientUuid/audiometry-entries/:entryUuid` | Registro completo |
| `POST` | `/patients/:patientUuid/audiometry-entries` | Guarda una audiometría nueva (201) |
| `POST` | `/patients/:patientUuid/audiometry-entries/:entryUuid/invalidate` | Marca la audiometría como "mal hecha" (200), definitivo |

Body de `POST`: `{ "schemaVersion": 1, "payload": { ... } }`. Reglas del payload: `marks` exige las 5 herramientas (`AIR`, `BONE`, `UCL`, `MCL`, `FREE_FIELD`), cada una con `RIGHT` y `LEFT` (mapa de frecuencia a marca, vacío si no hay); frecuencias `125, 250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000`; `thresholdDb` entero de -10 a 120. `weber` (opcional): `500|1000|2000|4000` a `CENTER|RIGHT|LEFT`. `speech.marks`: por oído, dB (0 a 100) a porcentaje (0 a 100); `wordListType` `BISYLLABLE|MONOSYLLABLE|null`, `wordListId` de ese tipo o `null`, `presentedWords` 10 si el tipo es `BISYLLABLE`, 25 si es `MONOSYLLABLE` (con `wordListType` en `null` vale cualquiera de los dos). Las intensidades (claves de `speech.marks`) van de 0 a 100 en pasos de 5 y sin ceros a la izquierda (`"5"`, no `"05"`). `summary.ptaType` `PTA_512|PTA_5124|PTA_124|PTA_251`, `gradingScale` `ASHA|BIAP`, y por oído `pta`, `grade` (`NORMAL`, `SLIGHT`, `MILD`, `MODERATE`, `MODERATELY_SEVERE`, `SEVERE`, `PROFOUND`, `TOTAL_LOSS`), `speechThresholdDb`, `maxDiscriminationPercent`, `failedWords` (todos nulables; `failedWords` no puede superar `presentedWords`). `pta` va en pasos de 5 dB y `grade` debe existir en la escala elegida (`ASHA` no tiene `TOTAL_LOSS`; `BIAP` no tiene `SLIGHT` ni `MODERATELY_SEVERE`). `isMasked: true` solo se acepta en `AIR` y `BONE`. `notes.diagnosis` y `notes.observations`: texto recortado, máximo 1000 caracteres. Claves desconocidas en `marks`/oídos (incluida una herramienta que no sea de las 5): 400. El `GET :entryUuid` y el `POST` responden 404 si el paciente está borrado (`deletedAt`).

```json
{
  "schemaVersion": 1,
  "payload": {
    "marks": {
      "AIR": { "RIGHT": { "500": { "thresholdDb": 25, "isMasked": false, "hasNoResponse": false }, "1000": { "thresholdDb": 30, "isMasked": false, "hasNoResponse": false } }, "LEFT": { "500": { "thresholdDb": 35, "isMasked": true, "hasNoResponse": false } } },
      "BONE": { "RIGHT": { "500": { "thresholdDb": 20, "isMasked": false, "hasNoResponse": false } }, "LEFT": {} },
      "UCL": { "RIGHT": {}, "LEFT": {} },
      "MCL": { "RIGHT": {}, "LEFT": {} },
      "FREE_FIELD": { "RIGHT": {}, "LEFT": {} }
    },
    "weber": { "500": "CENTER" },
    "speech": { "marks": { "RIGHT": { "40": 20, "60": 80 }, "LEFT": {} }, "wordListType": null, "wordListId": null, "presentedWords": 25 },
    "summary": {
      "ptaType": "PTA_512", "gradingScale": "ASHA",
      "ears": {
        "RIGHT": { "pta": 25, "grade": "SLIGHT", "speechThresholdDb": 35, "maxDiscriminationPercent": 92, "failedWords": 2 },
        "LEFT": { "pta": 35, "grade": "MILD", "speechThresholdDb": null, "maxDiscriminationPercent": null, "failedWords": null }
      }
    },
    "notes": { "diagnosis": "Hipoacusia leve", "observations": "Control en 6 meses" }
  }
}
```

Respuesta de `POST` (201) y de `GET :entryUuid` (200): `{ "uuid", "patientUuid", "schemaVersion", "payload", "createdAt", "createdByUuid", "createdByName", "invalidatedAt", "invalidatedByUuid", "invalidatedByName", "invalidationReason" }`. `createdByName` e `invalidatedByName` pueden ser `null` si identity no responde. Los cuatro campos de la marca son `null` mientras la audiometría no esté marcada.

Cada item del `GET` (lista, sin payload): `{ "uuid", "createdAt", "createdByUuid", "createdByName", "invalidatedAt", "invalidatedByUuid", "invalidatedByName", "invalidationReason", "ptaType", "gradingScale", "ptaRight", "ptaLeft" }` (`ptaType` y `gradingScale` salen del `summary` guardado, con los mismos valores del contrato; los PTA pueden ser `null`). La lista lee solo esas rutas del JSON, no el payload completo. Una audiometría marcada sigue apareciendo en la lista.

Errores: 400 payload inválido (detalle por campo), 401 sin token, 403 `STAFF`, 404 paciente o registro inexistente, borrado o de otro negocio/paciente.

### Marcar una audiometría como "mal hecha"

`POST /patients/:patientUuid/audiometry-entries/:entryUuid/invalidate`, body `{ "reason": "Oído cambiado al colocar los auriculares" }`. Mismos roles clínicos que crear (`STAFF` recibe 403).

- `reason` es obligatorio: se recorta, no puede quedar vacío y admite hasta 500 caracteres (400 si no cumple).
- La marca es definitiva: no hay ruta para quitarla. Marcar una audiometría que ya está marcada responde 409 y conserva la primera marca (también si dos peticiones llegan a la vez: gana una).
- Quién la marcó sale del token (nunca del body) y la fecha la pone el servidor. El payload clínico no cambia.
- Responde 200 con la entrada completa y actualizada, con la misma forma que `GET :entryUuid`; por ejemplo `"invalidatedAt": "2026-11-08T18:00:00.000Z"`, `"invalidatedByUuid": "…"`, `"invalidatedByName": "Dr. Luis"`, `"invalidationReason": "Oído cambiado al colocar los auriculares"`.
- Errores: 400 motivo inválido, 401 sin token, 403 `STAFF`, 404 entrada inexistente, de otro paciente, de otra clínica o con el paciente borrado, 409 ya marcada.

## Historial de otoscopías (Medical Records Service, port 7071)

**Acceso:** solo roles clínicos (`OWNER`, `ADMIN`, `DOCTOR`); `STAFF` recibe 403. Todo se filtra por el `tenantUuid` del token: un paciente o registro de otro negocio responde 404.

Cada otoscopía es un registro nuevo: nunca se pisa uno anterior. Reemplaza a la otoscopía única de `physical-exam` (esas rutas siguen, sin dual-write, hasta que el front migre).

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/patients/:patientUuid/otoscopy-entries` | Lista, el más reciente primero |
| `POST` | `/patients/:patientUuid/otoscopy-entries` | Crea un registro nuevo (201) |
| `PATCH` | `/patients/:patientUuid/otoscopy-entries/:entryUuid` | Corrige un registro (200) |

Body de `POST` y `PATCH`: `{ "otoscopyRight"?: string | null, "otoscopyLeft"?: string | null }`. Se recorta; `""` se guarda como `null`; máximo 1000 caracteres por oído. En `POST` debe venir texto en al menos un oído (400 si no). En `PATCH`, un oído que no viene conserva su texto, `null` o `""` lo limpia, y no puede quedar sin ningún oído (400).

Respuesta (cada item del `GET`, y el resultado de `POST` y `PATCH`):

```json
{
  "uuid": "…",
  "patientUuid": "…",
  "otoscopyRight": "Conducto permeable",
  "otoscopyLeft": null,
  "createdAt": "2026-11-02T16:00:00.000Z",
  "createdByUuid": "…",
  "createdByName": "Dra. Ana",
  "updatedAt": null,
  "updatedByUuid": null,
  "updatedByName": null,
  "canEdit": true
}
```

- `createdByUuid` / `createdByName` pueden ser `null` (registro copiado de la otoscopía única sin autor conocido, o identity sin responder).
- `updatedAt` / `updatedByUuid` / `updatedByName` son `null` mientras no se corrija; al corregir quedan quién y cuándo.
- `canEdit` es `true` solo el mismo día de calendario de Costa Rica en que se creó; el front no recalcula la fecha.
- `PATCH` en otro día: **409** "Este registro ya no se puede corregir: solo se corrige el mismo día en que se creó."
- Paciente inexistente, borrado o de otro negocio: 404. Registro inexistente: 404.
- Al corregir se guarda el texto anterior en `PatientOtoscopyEntryRevision`. Un `PATCH` sin cambios reales no guarda revisión ni marca "corregido".
- Crear y corregir anotan `PHYSICAL_EXAM_UPDATED` en la bitácora del paciente (campos `otoscopyRight` / `otoscopyLeft`).

## Plantillas de documento (Medical Records Service, port 7071)

Texto markdown con variables `{{clave}}`, una lista por negocio. **Acceso:** leer (`GET`) cualquier usuario autenticado; crear y editar solo roles clínicos (`OWNER`, `ADMIN`, `DOCTOR`), `STAFF` recibe 403 en `POST`/`PUT`. Todo se filtra por el `tenantUuid` del token: una plantilla de otro negocio responde 404. No hay borrado. El autor (`createdByUuid`/`updatedByUuid`) sale del token.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/document-templates` | Lista `{ uuid, name, description, updatedAt }[]` ordenada por nombre (español, sin distinguir mayúsculas) |
| `GET` | `/document-templates/:uuid` | Detalle `{ uuid, name, description, content, createdAt, updatedAt }` |
| `POST` | `/document-templates` | Crea (201) y devuelve el detalle |
| `PUT` | `/document-templates/:uuid` | Reemplaza nombre, descripción y contenido (200) y devuelve el detalle |

Body de `POST`/`PUT`: `{ "name", "description"?, "content" }`. `name` 1 a 120 caracteres (se recorta), `description` opcional o `null`, hasta 300 ("cuándo se usa"; vacía o `null` se guarda como `null`; en `PUT`, omitirla o mandar `null` la deja vacía), `content` requerido, 1 a 20000 caracteres con al menos uno que no sea blanco. El nombre repetido en la clínica (sin distinguir mayúsculas, comparación exacta: `_` y `%` no son comodines) responde 409. La lista sale ordenada por nombre sin distinguir mayúsculas ni tildes (`acta` antes que `Zeta`, `Árbol` con la A).

Variables permitidas (constante `DOCUMENT_TEMPLATE_VARIABLES` en `domain/types/document-template-variables.ts`): `nombre`, `apellidos`, `nombre_completo`, `tipo_documento`, `documento`, `fecha_nacimiento`, `edad`, `genero`, `telefono`, `correo`, `direccion`, `sedes`, `fecha_hoy`, `profesional`. Se ignoran los espacios dentro de las llaves (`{{ nombre }}`).

```json
{ "name": "Consentimiento", "description": "Antes de la audiometría", "content": "Yo {{nombre_completo}}, documento {{documento}}, autorizo..." }
```

Errores: 400 body inválido o variable desconocida (el mensaje nombra las claves, p. ej. `{{cedula}}`), 401 sin token, 403 `STAFF` al escribir, 404 plantilla inexistente o de otro negocio, 409 nombre repetido en el negocio (sin distinguir mayúsculas).
