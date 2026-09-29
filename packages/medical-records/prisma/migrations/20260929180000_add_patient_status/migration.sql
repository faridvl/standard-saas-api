-- Estado del paciente para la clínica: activo, inactivo (dejó de venir) o
-- fallecido. Independiente del borrado lógico (isActive/deletedAt).
--
-- Los pacientes existentes quedan como ACTIVE por el valor por defecto de
-- la columna, que es lo que ya eran: no se inventa ningún otro dato.
ALTER TABLE "Patient" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Patient" ADD COLUMN "statusReason" TEXT;
ALTER TABLE "Patient" ADD COLUMN "statusDate" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "statusChangedAt" TIMESTAMP(3);

CREATE INDEX "Patient_tenantUuid_status_idx" ON "Patient"("tenantUuid", "status");
