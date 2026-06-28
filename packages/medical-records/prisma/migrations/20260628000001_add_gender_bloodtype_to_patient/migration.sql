-- AlterTable: add bloodType to Patient (gender was added in a previous migration)
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Patient" ADD COLUMN "bloodType" TEXT;
