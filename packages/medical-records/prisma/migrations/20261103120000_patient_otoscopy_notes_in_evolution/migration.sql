-- El historial de otoscopia vive también en Control de evolución: una nota de categoría EXTERNAL_TEST
-- ("Pruebas") por cada otoscopia ya guardada, con el mismo formato que crea la API al registrar una nueva.
-- Fecha y autor: los de la otoscopia (si no hay quien la creó, quien la corrigió). Sin ninguno, la nota queda con autor vacío
-- (authorUuid no admite nulo) y el nombre queda en blanco en pantalla.
-- Segura de reaplicar: no inserta si ya hay una nota EXTERNAL_TEST del mismo paciente, con la misma
-- fecha y el mismo texto. Cada nota lleva el negocio de su otoscopia.
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
    o."patientUuid",
    o."tenantUuid",
    COALESCE(o."createdByUuid", o."updatedByUuid", '') AS "authorUuid",
    concat_ws(
      E'\n',
      'Otoscopia',
      CASE WHEN NULLIF(regexp_replace(o."otoscopyRight", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '') IS NOT NULL THEN 'OD: ' || regexp_replace(o."otoscopyRight", '^[[:space:]]+|[[:space:]]+$', '', 'g') END,
      CASE WHEN NULLIF(regexp_replace(o."otoscopyLeft", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '') IS NOT NULL THEN 'OI: ' || regexp_replace(o."otoscopyLeft", '^[[:space:]]+|[[:space:]]+$', '', 'g') END
    ) AS "text",
    o."createdAt"
  FROM "PatientOtoscopyEntry" o
  WHERE NULLIF(regexp_replace(o."otoscopyRight", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '') IS NOT NULL
     OR NULLIF(regexp_replace(o."otoscopyLeft", '^[[:space:]]+|[[:space:]]+$', '', 'g'), '') IS NOT NULL
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
