# Database

Two separate PostgreSQL 15 databases are provisioned by `init-db.sh`. Each has its own Prisma schema and migration history.

---

## Identity database (`IDENTITY_DB_URL`)

### Tables

#### `Tenant`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | internal numeric key |
| uuid | String (unique) | public identifier, auto-generated UUID |
| businessName | String | |
| businessType | String? | optional |
| status | Enum(ACTIVE, INACTIVE) | default ACTIVE |
| createdAt | DateTime | |
| updatedAt | DateTime | |

#### `User`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | |
| uuid | String (unique) | |
| email | String (unique) | |
| name | String | mapped to `fullName` in domain layer |
| password | String | bcrypt hash |
| role | String? | default "OWNER"; values: OWNER, ADMIN, DOCTOR, STAFF, USER, MEDICO |
| status | Enum(ACTIVE, INACTIVE) | default ACTIVE |
| specialty | String? | |
| avatarUrl | String? | |
| phoneNumber | String? | |
| tenantId | Int (FK → Tenant.id) | |
| tenantUUID | String? | denormalized UUID for query convenience |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Migrations (identity)
| Migration | Description |
|-----------|-------------|
| 20260126014242_init_identity | Initial Tenant + User tables |
| 20260214193921_first | First schema update |
| 20260215201508_add_users_fields | Added specialty, avatarUrl, phoneNumber |
| 20260215202931_new_role | Added new role values |

---

## Medical Records database (`MEDICAL_RECORDS_DB_URL`)

### Tables

#### `Patient`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | |
| uuid | String (unique) | |
| firstName | String | |
| lastName | String | |
| phone | String? | |
| address | String? | |
| birthDate | DateTime? | opcional |
| email | String? | |
| gender | String? | |
| tenantId | Int | not FK, denormalized |
| tenantUuid | String | used for multi-tenant filtering |
| createdBy | String | user UUID of creator |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Index: `@@index([tenantId])`

#### `MedicalControl`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | |
| uuid | String (unique) | |
| patientUUID | String | FK → Patient.uuid |
| userUUID | String | doctor who created it |
| tenantUUID | String | |
| appointmentUUID | String? (unique) | FK → Appointment.uuid (1-to-1) |
| speciality | String | AUDIOLOGY, DENTAL, GENERAL |
| findings | Json | structure varies by speciality |
| diagnosis | Text | |
| schemaVersion | Int | default 1, for future migrations |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `@@index([patientUUID])`, `@@index([tenantUUID])`

#### `AppointmentType`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | |
| uuid | String (unique) | |
| name | String | |
| duration | Int? | minutes |
| color | String? | UI hint |
| tenantUUID | String | |

Index: `@@index([tenantUUID])`

#### `Appointment`
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK) | |
| uuid | String (unique) | |
| patientUUID | String | FK → Patient.uuid |
| userUUID | String | assigned doctor |
| tenantUUID | String | |
| typeUUID | String | FK → AppointmentType.uuid |
| speciality | String | |
| status | String | TENTATIVE/PENDING/CONFIRMED/WAITING/COMPLETED/CANCELLED/EXPIRED |
| date | DateTime | |
| startTime | DateTime | |
| endTime | DateTime | |
| notes | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `@@index([patientUUID])`, `@@index([tenantUUID])`, `@@index([userUUID])`

#### `Product` (inventory)
| Column | Type | DB column | Notes |
|--------|------|-----------|-------|
| id | Int (PK) | id | |
| uuid | String (unique) | uuid | |
| tenantUuid | String | tenantUuid | |
| sku | String (unique) | sku | |
| name | String | name | |
| model | String? | model | |
| description | String? | description | |
| price | Decimal(15,2) | price | default 0.00 |
| minStock | Int | min_stock | default 5 |
| cabysCode | String? | cabys_code | Costa Rica CABYS catalog code |
| isActive | Boolean | is_active | default true; soft-delete pattern |
| speciality | String? | speciality | |
| createdAt | DateTime | created_at | |
| updatedAt | DateTime | updated_at | |

Indexes: `@@index([tenantUuid])`, `@@index([sku])`; Unique: `sku`

Stock real vive en `ProductUnit` (una fila por unidad física, con
`serialNumber`/`warrantyUntil`/`assignedToPatientUuid`), no en un contador
en `Product`. La antigua `current_stock` (y sus equivalentes viejos en
`PatientDevice`: `brand`, `model`, `productUuid`, `purchaseDate`,
`serialNumber`, `warrantyUntil`) se dejaron sin usar "para migración
gradual" al introducir `ProductUnit` (`20260630220000_add_product_units`)
y se eliminaron recién en `20260919090000_drop_legacy_inventory_columns`.
Si se vuelve a reemplazar un campo por un modelo nuevo, la migración que
lo hace debe incluir el `DROP COLUMN` de una vez — no dejarlo pendiente.

#### `User` (cache local de identity)
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | |
| uuid | String (unique) | mismo uuid que en identity |
| tenantUuid | String | |
| fullName | String | |
| updatedAt | DateTime | |

Copia local mínima, poblada de forma perezosa (get-or-create) para
resolver el nombre de quien creó un `PatientDocument`/`PatientNote` sin
depender de un JOIN cross-servicio con identity (que vive en otra base).
Ver `GetOrCreateUserUseCase` e `IdentityRepository`. Puede quedar
desactualizada si el usuario cambia de nombre en identity — mismo
trade-off que documenta `service-core-comx` para el mismo patrón.

Index: `@@index([tenantUuid])`

#### `PatientLabShipment` (historial de envíos de audífonos al laboratorio)
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | |
| uuid | String (unique) | |
| tenantUuid / patientUuid | String | FK a `Patient.uuid` |
| sentAt | DateTime | día de envío, a mediodía UTC |
| deliveredAt | DateTime? | día de entrega a mediodía UTC; null = sigue en laboratorio |
| note | String? | nota de la entrega (máx. 1000) |
| createdByUuid / deliveredByUuid | String? | quién envió / quién entregó |
| createdAt / updatedAt | DateTime | |

Index: `@@index([tenantUuid, patientUuid, sentAt])`. Máximo un envío abierto por paciente:
índice parcial único `PatientLabShipment_one_open_per_patient` (`WHERE "deliveredAt" IS NULL`),
solo en el SQL de la migración (Prisma no lo expresa). `Patient.hearingAidsInLabSince` sigue
siendo el interruptor; el envío abierto lleva el mismo día.

Reconciliación tras desplegar (idempotente; interruptor y envíos pueden haber quedado
desalineados si la migración corrió antes que el código nuevo). Correrla solo con permiso y
nunca contra una base que no sea la local de pruebas:
```sql
-- Cierra los envíos abiertos de pacientes con el interruptor apagado.
UPDATE "PatientLabShipment" s
SET "deliveredAt" = s."sentAt", "updatedAt" = CURRENT_TIMESTAMP
FROM "Patient" p
WHERE s."patientUuid" = p."uuid" AND s."deliveredAt" IS NULL AND p."hearingAidsInLabSince" IS NULL;

-- Abre el envío que falte a los pacientes con el interruptor prendido.
INSERT INTO "PatientLabShipment" ("uuid", "tenantUuid", "patientUuid", "sentAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", p."hearingAidsInLabSince", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Patient" p
WHERE p."hearingAidsInLabSince" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "PatientLabShipment" s WHERE s."patientUuid" = p."uuid" AND s."deliveredAt" IS NULL
  );
```

#### `PatientAudiometryEntry` (historial de audiometrías)
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | |
| uuid | String (unique) | |
| tenantUuid / patientUuid | String | `patientUuid` es FK a `Patient.uuid` |
| schemaVersion | Int | versión del contrato del payload (hoy 1) |
| payload | Json | audiometría completa, validada con Zod al guardar |
| createdAt | DateTime | |
| createdByUuid | String | autor, sale del token |
| invalidatedAt | DateTime? | marca definitiva de "mal hecha"; nulo = vigente |
| invalidatedByUuid | String? | quién la marcó (sale del token); el nombre se resuelve al leer |
| invalidationReason | String? | motivo, 1 a 500 caracteres (se valida en la app) |

Index: `@@index([tenantUuid, patientUuid, createdAt])`. Cada guardado es un registro inmutable
(sin edición ni borrado); lo único que cambia es la marca de "mal hecha", que se pone una sola vez
y nunca se quita, y los tres campos van juntos o todos nulos. La lista no trae el `payload`: lee solo `summary.ptaType`,
`summary.gradingScale` y el PTA de cada oído con `payload #>> '{...}'`.

#### `DocumentTemplate` (plantillas de documento)
| Column | Type | Notes |
|--------|------|-------|
| id | Int (PK, autoincrement) | |
| uuid | String (unique) | |
| tenantUuid | String | |
| name | String | 1 a 120, recortado |
| description | String? | "Cuándo se usa", hasta 300 |
| content | Text | markdown con `{{clave}}`, hasta 20000 |
| createdAt / updatedAt | DateTime | |
| createdByUuid / updatedByUuid | String | autor y último editor, salen del token |

Índice único `(tenantUuid, lower("name"))` creado solo en la migración con SQL crudo (Prisma no
expresa `lower()` en el schema); da el 409 por nombre repetido sin distinguir mayúsculas. Sin borrado.

### Migrations (medical-records)
| Migration | Description |
|-----------|-------------|
| 20260214195221_first | Patient + MedicalControl initial |
| 20260217072616_add_medical_control | MedicalControl schema changes |
| 20260217072659_add_patient_email | Added email to Patient |
| 20260217072715_add_patient_gender | Added gender to Patient |
| 20260218045243_add_appointments_table | Appointment + AppointmentType tables |
| 20260219235825_add_inventory | Product table |
| 20260630220000_add_product_units | ProductUnit table; deja columnas legacy de Product/PatientDevice sin usar a propósito |
| 20260919090000_drop_legacy_inventory_columns | Elimina current_stock (Product) y brand/model/productUuid/purchaseDate/serialNumber/warrantyUntil (PatientDevice), sin uso desde add_product_units |
| 20260919091500_add_local_user_cache | Tabla User (cache local de identity) |
| 20261107120000_patient_priority_and_activity_index | Columna `Patient.prioritySince` (DateTime?, nulo = sin prioridad, sin backfill) e índice `PatientActivity(tenantUuid, patientUuid, createdAt)` para el último movimiento |
| 20261102180000_patient_lab_shipments | Tabla PatientLabShipment; copia como envío abierto a los pacientes con `hearingAidsInLabSince` |
| 20261103120000_patient_otoscopy_notes_in_evolution | Datos: una nota `EXTERNAL_TEST` en PatientNote por cada otoscopia ya guardada (fecha y autor de la otoscopia); idempotente |
| 20261108120000_patient_audiometry_entries | Tabla PatientAudiometryEntry (historial de audiometrías, un registro inmutable por guardado) |
| 20261108130000_document_templates | Tabla DocumentTemplate (plantillas de documento por negocio) con índice único (tenantUuid, lower(name)) |
| 20261108140000_patient_audiometry_entry_invalidation | Columnas `PatientAudiometryEntry.invalidatedAt`, `invalidatedByUuid`, `invalidationReason` (todas nulas, sin backfill) |

### Naming conventions
- Prisma model names: PascalCase singular (`MedicalControl`)
- Columns: camelCase in Prisma, some use `@map("snake_case")` for DB column names (Product table)
- UUIDs: always named `uuid` on the model; foreign key references use full name (`patientUUID`, `tenantUUID`)
- The `id` (Int) field is always internal; external code always uses `uuid`

### Useful queries
```sql
-- All patients for a tenant
SELECT * FROM "Patient" WHERE "tenantUuid" = '<uuid>' ORDER BY "createdAt" DESC;

-- All appointments for a patient
SELECT a.*, at.name as type_name 
FROM "Appointment" a 
LEFT JOIN "AppointmentType" at ON a."typeUUID" = at.uuid
WHERE a."patientUUID" = '<patient_uuid>' AND a."tenantUUID" = '<tenant_uuid>';

-- Inventory below min stock (cuenta unidades AVAILABLE en ProductUnit, no un contador en Product)
SELECT p.*, COUNT(pu.id) AS available_units
FROM "Product" p
LEFT JOIN "ProductUnit" pu ON pu.product_id = p.id AND pu.status = 'AVAILABLE'
WHERE p."is_active" = true AND p."tenantUuid" = '<uuid>'
GROUP BY p.id
HAVING COUNT(pu.id) < p."min_stock";

-- Users for a tenant (identity database)
SELECT uuid, email, name, role, status FROM "User" WHERE "tenantUUID" = '<uuid>';
```
