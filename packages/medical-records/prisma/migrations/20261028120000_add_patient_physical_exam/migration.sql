-- Exploración física (otoscopia) en su propia tabla: sale de la historia clínica.
-- Copia la otoscopia de las historias ya llenas (primero la de `answers` si es texto, si no la columna);
-- las columnas de PatientBackground se conservan porque otros clientes todavía las leen.

-- CreateTable
CREATE TABLE "PatientPhysicalExam" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "otoscopyRight" TEXT,
    "otoscopyLeft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUuid" TEXT,
    "updatedByUuid" TEXT,

    CONSTRAINT "PatientPhysicalExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientPhysicalExam_uuid_key" ON "PatientPhysicalExam"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPhysicalExam_patientUuid_key" ON "PatientPhysicalExam"("patientUuid");

-- AddForeignKey
ALTER TABLE "PatientPhysicalExam" ADD CONSTRAINT "PatientPhysicalExam_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Datos existentes: solo las historias con al menos una otoscopia con contenido.
INSERT INTO "PatientPhysicalExam"
  ("uuid", "patientUuid", "otoscopyRight", "otoscopyLeft", "createdAt", "updatedAt", "createdByUuid", "updatedByUuid")
SELECT
  gen_random_uuid()::text,
  source."patientUuid",
  source."otoscopyRight",
  source."otoscopyLeft",
  source."createdAt",
  source."updatedAt",
  source."createdByUuid",
  source."updatedByUuid"
FROM (
  SELECT
    b."patientUuid",
    NULLIF(btrim(COALESCE(NULLIF(btrim(CASE WHEN jsonb_typeof(b."answers"->'otoscopyRight') = 'string' THEN b."answers"->>'otoscopyRight' END), ''), b."otoscopyRight")), '') AS "otoscopyRight",
    NULLIF(btrim(COALESCE(NULLIF(btrim(CASE WHEN jsonb_typeof(b."answers"->'otoscopyLeft') = 'string' THEN b."answers"->>'otoscopyLeft' END), ''), b."otoscopyLeft")), '') AS "otoscopyLeft",
    b."createdAt",
    b."updatedAt",
    b."createdByUuid",
    b."updatedByUuid"
  FROM "PatientBackground" b
) AS source
WHERE source."otoscopyRight" IS NOT NULL OR source."otoscopyLeft" IS NOT NULL;
