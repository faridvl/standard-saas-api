-- AlterTable
ALTER TABLE "PatientDevice" DROP COLUMN "brand",
DROP COLUMN "model",
DROP COLUMN "productUuid",
DROP COLUMN "purchaseDate",
DROP COLUMN "serialNumber",
DROP COLUMN "warrantyUntil";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "current_stock";

-- AlterTable
ALTER TABLE "ProductUnit" ALTER COLUMN "updated_at" DROP DEFAULT;

