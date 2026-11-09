-- Mantenimientos 1 a 4 (D40): vuelven los tres estados y cada uno tiene un historial de notas.
-- maintenanceNDone y maintenanceNNote se quedan en la tabla sin uso; se borrarán después.

CREATE TYPE "MaintenanceStatus" AS ENUM ('UNMARKED', 'ATTENDED', 'MISSED');

ALTER TABLE "Patient"
  ADD COLUMN "maintenance1Status" "MaintenanceStatus" NOT NULL DEFAULT 'UNMARKED',
  ADD COLUMN "maintenance2Status" "MaintenanceStatus" NOT NULL DEFAULT 'UNMARKED',
  ADD COLUMN "maintenance3Status" "MaintenanceStatus" NOT NULL DEFAULT 'UNMARKED',
  ADD COLUMN "maintenance4Status" "MaintenanceStatus" NOT NULL DEFAULT 'UNMARKED';

-- Check marcado pasa a asistido.
UPDATE "Patient" SET
  "maintenance1Status" = CASE WHEN "maintenance1Done" THEN 'ATTENDED'::"MaintenanceStatus" ELSE 'UNMARKED'::"MaintenanceStatus" END,
  "maintenance2Status" = CASE WHEN "maintenance2Done" THEN 'ATTENDED'::"MaintenanceStatus" ELSE 'UNMARKED'::"MaintenanceStatus" END,
  "maintenance3Status" = CASE WHEN "maintenance3Done" THEN 'ATTENDED'::"MaintenanceStatus" ELSE 'UNMARKED'::"MaintenanceStatus" END,
  "maintenance4Status" = CASE WHEN "maintenance4Done" THEN 'ATTENDED'::"MaintenanceStatus" ELSE 'UNMARKED'::"MaintenanceStatus" END
WHERE "maintenance1Done" OR "maintenance2Done" OR "maintenance3Done" OR "maintenance4Done";

-- CreateTable
CREATE TABLE "PatientMaintenanceNote" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUuid" TEXT,

    CONSTRAINT "PatientMaintenanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientMaintenanceNote_uuid_key" ON "PatientMaintenanceNote"("uuid");

-- CreateIndex
CREATE INDEX "PatientMaintenanceNote_patientUuid_number_createdAt_idx" ON "PatientMaintenanceNote"("patientUuid", "number", "createdAt");

-- CreateIndex
CREATE INDEX "PatientMaintenanceNote_tenantUuid_idx" ON "PatientMaintenanceNote"("tenantUuid");

-- AddForeignKey
ALTER TABLE "PatientMaintenanceNote" ADD CONSTRAINT "PatientMaintenanceNote_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cada nota vieja no vacía pasa a ser la primera nota de su mantenimiento. Fecha y autor salen
-- del último evento MAINTENANCE_NOTE_CHANGED de ese mantenimiento; sin evento, se usa la fecha
-- de la última actualización del paciente y sin autor.

INSERT INTO "PatientMaintenanceNote" ("uuid", "tenantUuid", "patientUuid", "number", "text", "createdAt", "createdByUuid")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", 1, left(btrim(p."maintenance1Note"), 500),
       COALESCE(ev."createdAt", p."updatedAt"), ev."actorUuid"
FROM "Patient" p
LEFT JOIN LATERAL (
  SELECT a."createdAt", a."actorUuid"
  FROM "PatientActivity" a
  WHERE a."patientUuid" = p."uuid"
    AND a."action" = 'MAINTENANCE_NOTE_CHANGED'
    AND a."detail"->>'number' = '1'
  ORDER BY a."createdAt" DESC, a."id" DESC
  LIMIT 1
) ev ON true
WHERE btrim(COALESCE(p."maintenance1Note", '')) <> '';

INSERT INTO "PatientMaintenanceNote" ("uuid", "tenantUuid", "patientUuid", "number", "text", "createdAt", "createdByUuid")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", 2, left(btrim(p."maintenance2Note"), 500),
       COALESCE(ev."createdAt", p."updatedAt"), ev."actorUuid"
FROM "Patient" p
LEFT JOIN LATERAL (
  SELECT a."createdAt", a."actorUuid"
  FROM "PatientActivity" a
  WHERE a."patientUuid" = p."uuid"
    AND a."action" = 'MAINTENANCE_NOTE_CHANGED'
    AND a."detail"->>'number' = '2'
  ORDER BY a."createdAt" DESC, a."id" DESC
  LIMIT 1
) ev ON true
WHERE btrim(COALESCE(p."maintenance2Note", '')) <> '';

INSERT INTO "PatientMaintenanceNote" ("uuid", "tenantUuid", "patientUuid", "number", "text", "createdAt", "createdByUuid")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", 3, left(btrim(p."maintenance3Note"), 500),
       COALESCE(ev."createdAt", p."updatedAt"), ev."actorUuid"
FROM "Patient" p
LEFT JOIN LATERAL (
  SELECT a."createdAt", a."actorUuid"
  FROM "PatientActivity" a
  WHERE a."patientUuid" = p."uuid"
    AND a."action" = 'MAINTENANCE_NOTE_CHANGED'
    AND a."detail"->>'number' = '3'
  ORDER BY a."createdAt" DESC, a."id" DESC
  LIMIT 1
) ev ON true
WHERE btrim(COALESCE(p."maintenance3Note", '')) <> '';

INSERT INTO "PatientMaintenanceNote" ("uuid", "tenantUuid", "patientUuid", "number", "text", "createdAt", "createdByUuid")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", 4, left(btrim(p."maintenance4Note"), 500),
       COALESCE(ev."createdAt", p."updatedAt"), ev."actorUuid"
FROM "Patient" p
LEFT JOIN LATERAL (
  SELECT a."createdAt", a."actorUuid"
  FROM "PatientActivity" a
  WHERE a."patientUuid" = p."uuid"
    AND a."action" = 'MAINTENANCE_NOTE_CHANGED'
    AND a."detail"->>'number' = '4'
  ORDER BY a."createdAt" DESC, a."id" DESC
  LIMIT 1
) ev ON true
WHERE btrim(COALESCE(p."maintenance4Note", '')) <> '';
