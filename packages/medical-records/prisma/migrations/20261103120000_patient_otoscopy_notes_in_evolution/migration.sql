-- El historial de otoscopia vive también en Control de evolución: una nota de categoría EXTERNAL_TEST
-- ("Pruebas") por cada otoscopia ya guardada, con el mismo formato que crea la API al registrar una nueva.
-- Fecha y autor: los de la otoscopia. Si la otoscopia no tiene autor, la nota queda con autor vacío
-- (authorUuid no admite nulo) y el nombre se muestra como "Sin registrar".
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
    COALESCE(o."createdByUuid", '') AS "authorUuid",
    concat_ws(
      E'\n',
      'Otoscopia',
      CASE WHEN NULLIF(btrim(o."otoscopyRight"), '') IS NOT NULL THEN 'OD: ' || btrim(o."otoscopyRight") END,
      CASE WHEN NULLIF(btrim(o."otoscopyLeft"), '') IS NOT NULL THEN 'OI: ' || btrim(o."otoscopyLeft") END
    ) AS "text",
    o."createdAt"
  FROM "PatientOtoscopyEntry" o
  WHERE NULLIF(btrim(o."otoscopyRight"), '') IS NOT NULL
     OR NULLIF(btrim(o."otoscopyLeft"), '') IS NOT NULL
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
