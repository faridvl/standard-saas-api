-- Teléfonos adicionales del paciente (contactos de referencia: hijo,
-- esposa, etc.). Patient.phone sigue siendo el teléfono principal,
-- obligatorio; esto es solo para los extra, sin tipo/etiqueta fija,
-- cada uno con el nombre de quién es.
CREATE TABLE "PatientContact" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientContact_uuid_key" ON "PatientContact"("uuid");

CREATE INDEX "PatientContact_patientUuid_idx" ON "PatientContact"("patientUuid");

CREATE INDEX "PatientContact_tenantUuid_idx" ON "PatientContact"("tenantUuid");

ALTER TABLE "PatientContact" ADD CONSTRAINT "PatientContact_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
