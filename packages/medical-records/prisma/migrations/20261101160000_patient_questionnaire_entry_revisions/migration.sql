-- Respuestas anteriores de un registro de Preguntas, una fila por cada corrección.

-- CreateTable
CREATE TABLE "PatientQuestionnaireEntryRevision" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "entryUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "revisedAt" TIMESTAMP(3) NOT NULL,
    "revisedByUuid" TEXT NOT NULL,

    CONSTRAINT "PatientQuestionnaireEntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientQuestionnaireEntryRevision_uuid_key" ON "PatientQuestionnaireEntryRevision"("uuid");

-- CreateIndex
CREATE INDEX "PatientQuestionnaireEntryRevision_entryUuid_revisedAt_idx" ON "PatientQuestionnaireEntryRevision"("entryUuid", "revisedAt");

-- CreateIndex
CREATE INDEX "PatientQuestionnaireEntryRevision_tenantUuid_idx" ON "PatientQuestionnaireEntryRevision"("tenantUuid");

-- AddForeignKey
ALTER TABLE "PatientQuestionnaireEntryRevision" ADD CONSTRAINT "PatientQuestionnaireEntryRevision_entryUuid_fkey" FOREIGN KEY ("entryUuid") REFERENCES "PatientQuestionnaireEntry"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

