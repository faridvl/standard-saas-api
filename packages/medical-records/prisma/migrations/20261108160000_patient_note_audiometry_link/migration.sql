-- Cada audiometría deja una nota en Control de evolución (categoría EXTERNAL_TEST, "Pruebas") enlazada
-- por `PatientNote.audiometryEntryUuid`, con el mismo texto que crea la API al registrar una nueva:
-- "Se realizó audiometría clínica el dd/MM/yyyy" (o "de rastreo"), con el día en hora de Costa Rica.
-- Fecha y autor: los de la audiometría. Las marcadas como mal hechas también llevan su nota:
-- marcar no toca la nota.
-- Segura de reaplicar: las columnas y el índice se crean solo si faltan, y una audiometría que ya
-- tiene nota enlazada no recibe otra.

-- AlterTable
ALTER TABLE "PatientNote" ADD COLUMN IF NOT EXISTS "audiometryEntryUuid" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PatientNote_audiometryEntryUuid_idx" ON "PatientNote"("audiometryEntryUuid");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PatientNote_audiometryEntryUuid_fkey'
  ) THEN
    ALTER TABLE "PatientNote"
      ADD CONSTRAINT "PatientNote_audiometryEntryUuid_fkey"
      FOREIGN KEY ("audiometryEntryUuid") REFERENCES "PatientAudiometryEntry"("uuid")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Texto de cada audiometría según su tipo, con el día en hora de Costa Rica.
DROP TABLE IF EXISTS "_audiometry_note_text";
CREATE TEMP TABLE "_audiometry_note_text" AS
SELECT
  a."uuid" AS "entryUuid",
  a."patientUuid",
  a."tenantUuid",
  a."createdByUuid" AS "authorUuid",
  a."createdAt",
  'Se realizó audiometría '
    || CASE a."typeCode" WHEN 'SCREENING' THEN 'de rastreo' ELSE 'clínica' END
    || ' el '
    || to_char(a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica', 'DD/MM/YYYY') AS "text",
  'Se realizó audiometría el '
    || to_char(a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica', 'DD/MM/YYYY') AS "legacyText"
FROM "PatientAudiometryEntry" a;

-- Notas ya creadas sin enlace (por el guardado anterior): se enlazan y toman el texto con el tipo.
UPDATE "PatientNote" n
SET "audiometryEntryUuid" = t."entryUuid", "text" = t."text"
FROM "_audiometry_note_text" t
WHERE n."audiometryEntryUuid" IS NULL
  AND n."patientUuid" = t."patientUuid"
  AND n."tenantUuid" = t."tenantUuid"
  AND n."category" = 'EXTERNAL_TEST'::"DocumentCategory"
  AND n."createdAt" = t."createdAt"
  AND n."text" IN (t."text", t."legacyText")
  AND NOT EXISTS (
    SELECT 1 FROM "PatientNote" linked WHERE linked."audiometryEntryUuid" = t."entryUuid"
  );

-- Audiometrías que todavía no tienen nota enlazada.
INSERT INTO "PatientNote"
  ("uuid", "patientUuid", "tenantUuid", "authorUuid", "category", "text", "createdAt", "audiometryEntryUuid")
SELECT
  gen_random_uuid()::text,
  t."patientUuid",
  t."tenantUuid",
  t."authorUuid",
  'EXTERNAL_TEST'::"DocumentCategory",
  t."text",
  t."createdAt",
  t."entryUuid"
FROM "_audiometry_note_text" t
WHERE NOT EXISTS (
  SELECT 1 FROM "PatientNote" linked WHERE linked."audiometryEntryUuid" = t."entryUuid"
);

DROP TABLE "_audiometry_note_text";
