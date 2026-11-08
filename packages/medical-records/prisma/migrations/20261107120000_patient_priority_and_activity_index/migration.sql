-- Marca de prioridad del paciente ("desde cuándo", null = sin marca). Sin relleno de datos.
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "prioritySince" TIMESTAMP(3);

-- Último movimiento por paciente (máximo de la bitácora) para los pacientes sin movimiento.
-- CreateIndex
CREATE INDEX "PatientActivity_tenantUuid_patientUuid_createdAt_idx" ON "PatientActivity"("tenantUuid", "patientUuid", "createdAt");
