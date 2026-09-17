-- Catálogo de sedes (sucursales físicas). Reemplaza Patient.sede (string
-- libre, sin uso real en frontend) por Patient.branchUuid (FK a Branch) como
-- sede habitual/por defecto, y agrega Appointment.branchUUID como la sede
-- real de cada cita (un paciente puede atenderse en sedes distintas mes a
-- mes). Sin pantalla de administración todavía: se precargan las sedes
-- conocidas de AudioColors a mano en este mismo archivo (roadmap pendiente).
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_uuid_key" ON "Branch"("uuid");

CREATE INDEX "Branch_tenantUuid_idx" ON "Branch"("tenantUuid");

ALTER TABLE "Patient" ADD COLUMN "branchUuid" TEXT;

CREATE INDEX "Patient_branchUuid_idx" ON "Patient"("branchUuid");

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_branchUuid_fkey" FOREIGN KEY ("branchUuid") REFERENCES "Branch"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Patient" DROP COLUMN "sede";

ALTER TABLE "Appointment" ADD COLUMN "branchUUID" TEXT;

CREATE INDEX "Appointment_branchUUID_idx" ON "Appointment"("branchUUID");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchUUID_fkey" FOREIGN KEY ("branchUUID") REFERENCES "Branch"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: sedes de AudioColors (tenant AudioColors, ver CLAUDE.md)
INSERT INTO "Branch" ("uuid", "tenantUuid", "name") VALUES
  (gen_random_uuid()::text, '9e781ab3-f1db-4311-a9a2-ae2afb595718', 'Pérez Zeledón'),
  (gen_random_uuid()::text, '9e781ab3-f1db-4311-a9a2-ae2afb595718', 'Río Claro'),
  (gen_random_uuid()::text, '9e781ab3-f1db-4311-a9a2-ae2afb595718', 'Ciudad Neily'),
  (gen_random_uuid()::text, '9e781ab3-f1db-4311-a9a2-ae2afb595718', 'Quepos'),
  (gen_random_uuid()::text, '9e781ab3-f1db-4311-a9a2-ae2afb595718', 'Uvita');
