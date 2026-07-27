-- CreateTable Study: una medición estructurada (audiometría, test
-- psicométrico...), separada de MedicalControl. Inmutable — repetir la
-- medición crea un registro nuevo (append-only, NOM-004 5.11).
CREATE TABLE "Study" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "encounterUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "autorUuid" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "documentUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Study_uuid_key" ON "Study"("uuid");

-- CreateIndex
CREATE INDEX "Study_encounterUuid_idx" ON "Study"("encounterUuid");

-- CreateIndex
CREATE INDEX "Study_patientUuid_idx" ON "Study"("patientUuid");

-- CreateIndex
CREATE INDEX "Study_tenantUuid_idx" ON "Study"("tenantUuid");

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_encounterUuid_fkey" FOREIGN KEY ("encounterUuid") REFERENCES "Encounter"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
