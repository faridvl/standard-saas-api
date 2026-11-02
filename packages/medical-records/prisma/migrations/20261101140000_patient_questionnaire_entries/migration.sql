-- Secciones propias de la clínica: cada vez que se llena una queda un registro del paciente.
CREATE TABLE "PatientQuestionnaireEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "templateUuid" TEXT NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUuid" TEXT NOT NULL,

    CONSTRAINT "PatientQuestionnaireEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientQuestionnaireEntry_uuid_key" ON "PatientQuestionnaireEntry"("uuid");

CREATE INDEX "PatientQuestionnaireEntry_patientUuid_createdAt_idx" ON "PatientQuestionnaireEntry"("patientUuid", "createdAt");

CREATE INDEX "PatientQuestionnaireEntry_templateUuid_idx" ON "PatientQuestionnaireEntry"("templateUuid");

ALTER TABLE "PatientQuestionnaireEntry" ADD CONSTRAINT "PatientQuestionnaireEntry_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
