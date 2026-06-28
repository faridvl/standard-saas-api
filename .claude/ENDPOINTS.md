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
**Response 201:** Created medical control.  
**Status:** Implemented. Note: `followUp` storage is commented out — `followUp` data is accepted but not persisted.

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
