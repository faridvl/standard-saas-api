-- Marca definitiva de audiometria "mal hecha": motivo, autor y fecha. Sin backfill; el payload no se toca.

-- AlterTable
ALTER TABLE "PatientAudiometryEntry" ADD COLUMN "invalidatedAt" TIMESTAMP(3),
ADD COLUMN "invalidatedByUuid" TEXT,
ADD COLUMN "invalidationReason" TEXT;
