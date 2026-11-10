-- Motivo de prioridad del paciente y quién la marcó. Las prioridades ya marcadas quedan sin motivo.
ALTER TABLE "Patient"
  ADD COLUMN "priorityReason" TEXT,
  ADD COLUMN "priorityByUuid" TEXT;

-- Equipos de audiometría de la clínica.
CREATE TABLE "ClinicEquipment" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "tenantUuid" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicEquipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicEquipment_uuid_key" ON "ClinicEquipment"("uuid");
CREATE INDEX "ClinicEquipment_tenantUuid_idx" ON "ClinicEquipment"("tenantUuid");

-- Marca + modelo no se repite en la clínica, sin distinguir mayúsculas ni espacios de los extremos.
CREATE UNIQUE INDEX "ClinicEquipment_tenant_brand_model_key"
  ON "ClinicEquipment"("tenantUuid", lower(btrim("brand")), lower(btrim("model")));

-- Equipo de cada audiometría nueva, con copia de marca y modelo. Las anteriores quedan en null.
ALTER TABLE "PatientAudiometryEntry"
  ADD COLUMN "equipmentUuid" TEXT,
  ADD COLUMN "equipmentBrand" TEXT,
  ADD COLUMN "equipmentModel" TEXT;

ALTER TABLE "PatientAudiometryEntry"
  ADD CONSTRAINT "PatientAudiometryEntry_equipmentUuid_fkey"
  FOREIGN KEY ("equipmentUuid") REFERENCES "ClinicEquipment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
