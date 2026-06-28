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
| birthDate | DateTime | |
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
| currentStock | Int | current_stock | default 0 |
| minStock | Int | min_stock | default 5 |
| cabysCode | String? | cabys_code | Costa Rica CABYS catalog code |
| isActive | Boolean | is_active | default true; soft-delete pattern |
| speciality | String? | speciality | |
| createdAt | DateTime | created_at | |
| updatedAt | DateTime | updated_at | |

Indexes: `@@index([tenantUuid])`, `@@index([sku])`; Unique: `sku`

### Migrations (medical-records)
| Migration | Description |
|-----------|-------------|
| 20260214195221_first | Patient + MedicalControl initial |
| 20260217072616_add_medical_control | MedicalControl schema changes |
| 20260217072659_add_patient_email | Added email to Patient |
| 20260217072715_add_patient_gender | Added gender to Patient |
| 20260218045243_add_appointments_table | Appointment + AppointmentType tables |
| 20260219235825_add_inventory | Product table |

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

-- Inventory below min stock
SELECT * FROM "Product" WHERE "is_active" = true AND "current_stock" < "min_stock" AND "tenantUuid" = '<uuid>';

-- Users for a tenant
SELECT uuid, email, name, role, status FROM "User" WHERE "tenantUUID" = '<uuid>';
```
