-- Niveles de acceso (RECEPTION, ADMIN, OWNER) + "atiende pacientes" con especialidades de catálogo.
ALTER TABLE "User"
  ADD COLUMN "attendsPatients" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "professionalTitle" TEXT,
  ADD COLUMN "licenseNumber" TEXT;

UPDATE "User" SET
  "attendsPatients" = COALESCE("role" IN ('OWNER', 'DOCTOR'), false),
  "specialties" = CASE
    WHEN COALESCE("role" IN ('OWNER', 'DOCTOR'), false) THEN ARRAY['AUDIOLOGY']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END,
  "role" = CASE "role"
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
