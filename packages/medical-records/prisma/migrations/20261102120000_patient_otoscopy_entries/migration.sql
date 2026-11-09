-- Historial de otoscopia: cada evaluación es un registro con fecha y autor (antes había una por paciente).
-- Las columnas de PatientBackground y la tabla PatientPhysicalExam se conservan porque el front vigente
-- todavía las lee; se borran en una migración posterior, cuando ese front ya no las use.

-- CreateTable
CREATE TABLE "PatientOtoscopyEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "otoscopyRight" TEXT,
    "otoscopyLeft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUuid" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedByUuid" TEXT,

    CONSTRAINT "PatientOtoscopyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientOtoscopyEntryRevision" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "entryUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "otoscopyRight" TEXT,
    "otoscopyLeft" TEXT,
    "revisedAt" TIMESTAMP(3) NOT NULL,
    "revisedByUuid" TEXT NOT NULL,

    CONSTRAINT "PatientOtoscopyEntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientOtoscopyEntry_uuid_key" ON "PatientOtoscopyEntry"("uuid");

-- CreateIndex
CREATE INDEX "PatientOtoscopyEntry_tenantUuid_patientUuid_createdAt_idx" ON "PatientOtoscopyEntry"("tenantUuid", "patientUuid", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientOtoscopyEntryRevision_uuid_key" ON "PatientOtoscopyEntryRevision"("uuid");

-- CreateIndex
CREATE INDEX "PatientOtoscopyEntryRevision_entryUuid_revisedAt_idx" ON "PatientOtoscopyEntryRevision"("entryUuid", "revisedAt");

-- CreateIndex
CREATE INDEX "PatientOtoscopyEntryRevision_tenantUuid_idx" ON "PatientOtoscopyEntryRevision"("tenantUuid");

-- AddForeignKey
ALTER TABLE "PatientOtoscopyEntry" ADD CONSTRAINT "PatientOtoscopyEntry_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientOtoscopyEntryRevision" ADD CONSTRAINT "PatientOtoscopyEntryRevision_entryUuid_fkey" FOREIGN KEY ("entryUuid") REFERENCES "PatientOtoscopyEntry"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Datos existentes: un primer registro por cada paciente con al menos una otoscopia con contenido.
-- Fecha: la última vez que se guardó (PatientPhysicalExam.updatedAt, que nunca es nula).
-- Autor: quien la guardó por última vez; si no se sabe, el que la creó; si tampoco, queda nulo ("Sin registrar").
INSERT INTO "PatientOtoscopyEntry"
  ("uuid", "tenantUuid", "patientUuid", "otoscopyRight", "otoscopyLeft", "createdAt", "createdByUuid")
SELECT
  gen_random_uuid()::text,
  p."tenantUuid",
  e."patientUuid",
  NULLIF(btrim(e."otoscopyRight"), ''),
  NULLIF(btrim(e."otoscopyLeft"), ''),
  e."updatedAt",
  COALESCE(e."updatedByUuid", e."createdByUuid")
FROM "PatientPhysicalExam" e
JOIN "Patient" p ON p."uuid" = e."patientUuid"
WHERE NULLIF(btrim(e."otoscopyRight"), '') IS NOT NULL
   OR NULLIF(btrim(e."otoscopyLeft"), '') IS NOT NULL;
