-- Mantenimientos 1 a 4: de un estado (asistido/perdido) a un check y una nota opcional.
ALTER TABLE "Patient"
  ADD COLUMN "maintenance1Done" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maintenance1Note" TEXT,
  ADD COLUMN "maintenance2Done" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maintenance2Note" TEXT,
  ADD COLUMN "maintenance3Done" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maintenance3Note" TEXT,
  ADD COLUMN "maintenance4Done" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maintenance4Note" TEXT;

-- Asistido pasa a check marcado; perdido queda sin check y con la nota "Perdido"
-- para no perder ese dato.
UPDATE "Patient" SET
  "maintenance1Done" = COALESCE("maintenance1Status" = 'ATTENDED', false),
  "maintenance1Note" = CASE WHEN "maintenance1Status" = 'MISSED' THEN 'Perdido' END,
  "maintenance2Done" = COALESCE("maintenance2Status" = 'ATTENDED', false),
  "maintenance2Note" = CASE WHEN "maintenance2Status" = 'MISSED' THEN 'Perdido' END,
  "maintenance3Done" = COALESCE("maintenance3Status" = 'ATTENDED', false),
  "maintenance3Note" = CASE WHEN "maintenance3Status" = 'MISSED' THEN 'Perdido' END,
  "maintenance4Done" = COALESCE("maintenance4Status" = 'ATTENDED', false),
  "maintenance4Note" = CASE WHEN "maintenance4Status" = 'MISSED' THEN 'Perdido' END
WHERE "maintenance1Status" IS NOT NULL OR "maintenance2Status" IS NOT NULL
   OR "maintenance3Status" IS NOT NULL OR "maintenance4Status" IS NOT NULL;

ALTER TABLE "Patient"
  DROP COLUMN "maintenance1Status",
  DROP COLUMN "maintenance2Status",
  DROP COLUMN "maintenance3Status",
  DROP COLUMN "maintenance4Status";

DROP TYPE "MaintenanceStatus";
