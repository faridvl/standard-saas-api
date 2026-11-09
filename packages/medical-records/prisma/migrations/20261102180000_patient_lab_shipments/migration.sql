-- Historial de envíos de audífonos al laboratorio. Patient.hearingAidsInLabSince se conserva:
-- sigue siendo el interruptor y el filtro de la lista; el envío abierto lleva el mismo día.

-- CreateTable
CREATE TABLE "PatientLabShipment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "note" TEXT,
    "createdByUuid" TEXT,
    "deliveredByUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientLabShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientLabShipment_uuid_key" ON "PatientLabShipment"("uuid");

-- CreateIndex
CREATE INDEX "PatientLabShipment_tenantUuid_patientUuid_sentAt_idx" ON "PatientLabShipment"("tenantUuid", "patientUuid", "sentAt");

-- Máximo un envío abierto por paciente (Prisma no modela índices parciales).
CREATE UNIQUE INDEX "PatientLabShipment_one_open_per_patient" ON "PatientLabShipment"("patientUuid") WHERE "deliveredAt" IS NULL;

-- AddForeignKey
ALTER TABLE "PatientLabShipment" ADD CONSTRAINT "PatientLabShipment_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Datos existentes: cada paciente con los audífonos hoy en el laboratorio recibe su envío abierto
-- con el día de envío ya guardado. Autor nulo: no se sabe quién los envió.
INSERT INTO "PatientLabShipment" ("uuid", "tenantUuid", "patientUuid", "sentAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."tenantUuid", p."uuid", p."hearingAidsInLabSince", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Patient" p
WHERE p."hearingAidsInLabSince" IS NOT NULL;
