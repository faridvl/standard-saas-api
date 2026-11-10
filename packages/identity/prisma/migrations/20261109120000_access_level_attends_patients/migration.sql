-- Niveles de acceso (RECEPTION, ADMIN, OWNER) + "atiende pacientes" con especialidades de catálogo.
ALTER TABLE "User"
  ADD COLUMN "attendsPatients" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "professionalTitle" TEXT,
  ADD COLUMN "licenseNumber" TEXT;

-- Respaldo del rol y la especialidad previos: el mapeo pierde el original y la columna se elimina.
CREATE TABLE "_UserRoleBackup20261109" AS
  SELECT "id", "role", "specialty" FROM "User";

-- OWNER y DOCTOR atienden; ADMIN conserva su nivel; todo lo demás (STAFF, USER, MEDICO, nulo,
-- valores desconocidos) queda en RECEPTION sin atender.
UPDATE "User" SET
  "attendsPatients" = COALESCE(UPPER(TRIM("role")) IN ('OWNER', 'DOCTOR'), false),
  "specialties" = CASE
    WHEN COALESCE(UPPER(TRIM("role")) IN ('OWNER', 'DOCTOR'), false) THEN ARRAY['AUDIOLOGY']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END,
  "role" = CASE UPPER(TRIM("role"))
    WHEN 'OWNER' THEN 'OWNER'
    WHEN 'ADMIN' THEN 'ADMIN'
    ELSE 'RECEPTION'
  END;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'RECEPTION';
ALTER TABLE "User" DROP COLUMN "specialty";

CREATE TABLE "UserAudit" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "tenantUUID" TEXT NOT NULL,
  "actorUuid" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "targetUuid" TEXT NOT NULL,
  "targetName" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "before" TEXT,
  "after" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAudit_uuid_key" ON "UserAudit"("uuid");
CREATE INDEX "UserAudit_tenantUUID_createdAt_idx" ON "UserAudit"("tenantUUID", "createdAt");
CREATE INDEX "UserAudit_targetUuid_idx" ON "UserAudit"("targetUuid");
