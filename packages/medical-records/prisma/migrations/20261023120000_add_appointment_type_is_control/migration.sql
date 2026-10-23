-- El tipo de cita que cuenta como control (tarjeta "Controles este mes"), antes
-- reconocido por su nombre. Uno por tenant como máximo.
ALTER TABLE "AppointmentType" ADD COLUMN "isControl" BOOLEAN NOT NULL DEFAULT false;

-- Conserva lo que ya funcionaba: en cada tenant se marca el tipo llamado "Control"
-- (el primero creado, si hubiera más de uno).
UPDATE "AppointmentType" SET "isControl" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("tenantUUID") "id"
  FROM "AppointmentType"
  WHERE lower(trim("name")) = 'control'
  ORDER BY "tenantUUID", "id"
);
