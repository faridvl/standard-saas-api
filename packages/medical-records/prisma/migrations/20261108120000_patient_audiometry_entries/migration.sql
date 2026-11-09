-- Audiometrías guardadas por paciente: cada guardado es un registro inmutable con su contrato versionado.

-- CreateTable
CREATE TABLE "PatientAudiometryEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUuid" TEXT NOT NULL,

    CONSTRAINT "PatientAudiometryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientAudiometryEntry_uuid_key" ON "PatientAudiometryEntry"("uuid");

-- CreateIndex
CREATE INDEX "PatientAudiometryEntry_tenantUuid_patientUuid_createdAt_idx" ON "PatientAudiometryEntry"("tenantUuid", "patientUuid", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientAudiometryEntry" ADD CONSTRAINT "PatientAudiometryEntry_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
