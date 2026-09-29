-- Bitácora de acciones sobre pacientes (alta, datos, contactos, notas,
-- archivos, citas). Append-only: se escribe desde los casos de uso y nunca
-- se edita ni se borra.
--
-- Arranca vacía a propósito: no se reconstruye historial anterior. Solo
-- crea la tabla, no toca ningún dato existente.
CREATE TABLE "PatientActivity" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "actorUuid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientActivity_uuid_key" ON "PatientActivity"("uuid");
CREATE INDEX "PatientActivity_tenantUuid_createdAt_idx" ON "PatientActivity"("tenantUuid", "createdAt");
CREATE INDEX "PatientActivity_patientUuid_idx" ON "PatientActivity"("patientUuid");
CREATE INDEX "PatientActivity_actorUuid_idx" ON "PatientActivity"("actorUuid");
