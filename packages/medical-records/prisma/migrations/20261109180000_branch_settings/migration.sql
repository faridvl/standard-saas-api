-- Configuración de sedes: teléfono, dirección y color por sede.
CREATE TYPE "BranchColor" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE');

ALTER TABLE "Branch"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "color" "BranchColor" NOT NULL DEFAULT 'BLUE';

-- Las sedes existentes conservan el color que el front calculaba por nombre
-- (sin distinguir mayúsculas ni tildes, "contiene"); las demás quedan en BLUE.
UPDATE "Branch" SET "color" = CASE
  WHEN translate(lower("name"), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE '%rio claro%' THEN 'BLUE'::"BranchColor"
  WHEN translate(lower("name"), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE '%quepos%' THEN 'YELLOW'::"BranchColor"
  WHEN translate(lower("name"), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE '%neily%' THEN 'RED'::"BranchColor"
  WHEN translate(lower("name"), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE '%perez zeledon%' THEN 'ORANGE'::"BranchColor"
  WHEN translate(lower("name"), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE '%uvita%' THEN 'PURPLE'::"BranchColor"
  ELSE 'BLUE'::"BranchColor"
END;
