CREATE TABLE "ClinicalTemplate" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "tenantUuid" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "speciality" TEXT NOT NULL,
  "fields" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicalTemplate_uuid_key" ON "ClinicalTemplate"("uuid");
