-- CreateTable Encounter: la visita como unidad persistente (reemplaza
-- consulta-session.ts en sessionStorage). appointmentUuid es NULLABLE:
-- hay encuentros sin cita (walk-in) y citas sin encuentro (no asistió).
CREATE TABLE "Encounter" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "autorUuid" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "appointmentUuid" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_uuid_key" ON "Encounter"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentUuid_key" ON "Encounter"("appointmentUuid");

-- CreateIndex
CREATE INDEX "Encounter_patientUuid_idx" ON "Encounter"("patientUuid");

-- CreateIndex
CREATE INDEX "Encounter_tenantUuid_idx" ON "Encounter"("tenantUuid");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentUuid_fkey" FOREIGN KEY ("appointmentUuid") REFERENCES "Appointment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable MedicalControl: encounterUuid nullable durante la transición,
-- no rompe los registros existentes.
ALTER TABLE "MedicalControl" ADD COLUMN "encounterUuid" TEXT;

-- CreateIndex
CREATE INDEX "MedicalControl_encounterUuid_idx" ON "MedicalControl"("encounterUuid");

-- AddForeignKey
ALTER TABLE "MedicalControl" ADD CONSTRAINT "MedicalControl_encounterUuid_fkey" FOREIGN KEY ("encounterUuid") REFERENCES "Encounter"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Maintenance: encounterUuid nullable, mismo motivo.
ALTER TABLE "Maintenance" ADD COLUMN "encounterUuid" TEXT;

-- CreateIndex
CREATE INDEX "Maintenance_encounterUuid_idx" ON "Maintenance"("encounterUuid");

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_encounterUuid_fkey" FOREIGN KEY ("encounterUuid") REFERENCES "Encounter"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
