-- Mantenimientos 1 a 4 del paciente, marcados a mano por el personal.
CREATE TYPE "MaintenanceStatus" AS ENUM ('ATTENDED', 'MISSED');

ALTER TABLE "Patient"
  ADD COLUMN "maintenance1Status" "MaintenanceStatus",
  ADD COLUMN "maintenance2Status" "MaintenanceStatus",
  ADD COLUMN "maintenance3Status" "MaintenanceStatus",
  ADD COLUMN "maintenance4Status" "MaintenanceStatus";
