-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "purchaseDate" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "photoUrl" TEXT,
    "notes" TEXT,
    "assignedToPatientUuid" TEXT,
    "assignedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_uuid_key" ON "ProductUnit"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_serialNumber_key" ON "ProductUnit"("serialNumber");

-- CreateIndex
CREATE INDEX "ProductUnit_product_id_idx" ON "ProductUnit"("product_id");

-- CreateIndex
CREATE INDEX "ProductUnit_status_idx" ON "ProductUnit"("status");

-- CreateIndex
CREATE INDEX "ProductUnit_serialNumber_idx" ON "ProductUnit"("serialNumber");

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Product: agregar campo brand, mantener current_stock por compatibilidad (se ignora, stock se calcula)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;

-- AlterTable PatientDevice: agregar FK a ProductUnit, mantener columnas viejas como nullable para migración gradual
ALTER TABLE "PatientDevice" ADD COLUMN IF NOT EXISTS "product_unit_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PatientDevice_product_unit_id_idx" ON "PatientDevice"("product_unit_id");

-- AddForeignKey
ALTER TABLE "PatientDevice" ADD CONSTRAINT "PatientDevice_product_unit_id_fkey" FOREIGN KEY ("product_unit_id") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migración de datos: por cada PatientDevice con serialNumber, crear ProductUnit si no existe
-- y vincular. Solo para datos legacy que tengan producto vinculado.
-- (Se ejecuta de forma segura: si serialNumber es NULL o vacío, se omite)
DO $$
DECLARE
  dev RECORD;
  prod_row RECORD;
  unit_id INTEGER;
BEGIN
  FOR dev IN
    SELECT pd.id, pd."patientUuid", pd."serialNumber", pd."brand", pd."model",
           pd."purchaseDate", pd."warrantyUntil", pd."productUuid", p.id AS product_db_id
    FROM "PatientDevice" pd
    LEFT JOIN "Product" p ON p.uuid = pd."productUuid"
    WHERE pd."serialNumber" IS NOT NULL AND pd."serialNumber" != ''
      AND pd."product_unit_id" IS NULL
  LOOP
    IF dev.product_db_id IS NOT NULL THEN
      -- Insertar ProductUnit si el serial no existe
      INSERT INTO "ProductUnit" (uuid, "serialNumber", status, "purchaseDate", "warrantyUntil",
                                  "assignedToPatientUuid", "assignedAt", product_id,
                                  created_at, updated_at)
      VALUES (gen_random_uuid(), dev."serialNumber", 'ASSIGNED',
              dev."purchaseDate", dev."warrantyUntil",
              dev."patientUuid", NOW(),
              dev.product_db_id, NOW(), NOW())
      ON CONFLICT ("serialNumber") DO NOTHING;

      SELECT id INTO unit_id FROM "ProductUnit" WHERE "serialNumber" = dev."serialNumber";

      IF unit_id IS NOT NULL THEN
        UPDATE "PatientDevice" SET "product_unit_id" = unit_id WHERE id = dev.id;
      END IF;
    END IF;
  END LOOP;
END $$;
