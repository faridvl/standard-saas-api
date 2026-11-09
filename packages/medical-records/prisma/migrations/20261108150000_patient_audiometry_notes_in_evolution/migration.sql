-- Cada audiometría ya guardada deja su nota en Control de evolución (categoría EXTERNAL_TEST, "Pruebas"),
-- con el mismo formato que crea la API al registrar una nueva: "Se realizó audiometría el dd/MM/yyyy",
-- con el día en hora de Costa Rica. Fecha y autor: los de la audiometría. Las marcadas como mal hechas
-- también llevan su nota: marcar no toca la nota.
-- Segura de reaplicar: no inserta si ya hay una nota EXTERNAL_TEST del mismo paciente, con la misma
-- fecha y el mismo texto.
INSERT INTO "PatientNote"
  ("uuid", "patientUuid", "tenantUuid", "authorUuid", "category", "text", "createdAt")
SELECT
  gen_random_uuid()::text,
  s."patientUuid",
  s."tenantUuid",
  s."authorUuid",
  'EXTERNAL_TEST'::"DocumentCategory",
  s."text",
  s."createdAt"
FROM (
  SELECT
    a."patientUuid",
    a."tenantUuid",
    a."createdByUuid" AS "authorUuid",
    'Se realizó audiometría el ' || to_char(a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica', 'DD/MM/YYYY') AS "text",
    a."createdAt"
  FROM "PatientAudiometryEntry" a
) s
WHERE NOT EXISTS (
  SELECT 1
  FROM "PatientNote" n
  WHERE n."patientUuid" = s."patientUuid"
    AND n."tenantUuid" = s."tenantUuid"
    AND n."category" = 'EXTERNAL_TEST'::"DocumentCategory"
    AND n."createdAt" = s."createdAt"
    AND n."text" = s."text"
);
