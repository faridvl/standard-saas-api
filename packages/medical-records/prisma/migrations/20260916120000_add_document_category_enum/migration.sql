-- Reemplaza el catálogo de categorías de PatientDocument (antes string libre
-- sin validación) por un enum real. Se elimina RECEIPT; los documentos con
-- categoría no reconocida (RECEIPT u otro valor viejo) migran a OTHER.
CREATE TYPE "DocumentCategory" AS ENUM ('EVOLUTION_CONTROL', 'WARRANTY', 'EXTERNAL_TEST', 'CLINICAL_HISTORY', 'OTHER');

UPDATE "PatientDocument"
SET "category" = 'OTHER'
WHERE "category" NOT IN ('EVOLUTION_CONTROL', 'WARRANTY', 'EXTERNAL_TEST', 'CLINICAL_HISTORY', 'OTHER');

ALTER TABLE "PatientDocument"
  ALTER COLUMN "category" DROP DEFAULT,
  ALTER COLUMN "category" TYPE "DocumentCategory" USING ("category"::"DocumentCategory"),
  ALTER COLUMN "category" SET DEFAULT 'OTHER';
