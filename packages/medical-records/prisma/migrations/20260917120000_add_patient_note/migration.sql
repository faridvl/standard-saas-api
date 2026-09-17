-- Control de evolución: bitácora libre del paciente (qué hizo el médico en
-- la consulta), sin ligarse a una cita/encounter formal. Append-only
-- (NOM-004 5.10/5.11): toda nota lleva autor, no se edita ni se borra.
CREATE TABLE "PatientNote" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "authorUuid" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'EVOLUTION_CONTROL',
    "text" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientNote_uuid_key" ON "PatientNote"("uuid");

CREATE INDEX "PatientNote_patientUuid_idx" ON "PatientNote"("patientUuid");

CREATE INDEX "PatientNote_tenantUuid_idx" ON "PatientNote"("tenantUuid");

ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
