-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "sede" TEXT;

-- CreateTable
CREATE TABLE "PatientBackground" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "earInfections" BOOLEAN NOT NULL DEFAULT false,
    "nasalSurgery" BOOLEAN NOT NULL DEFAULT false,
    "throatSurgery" BOOLEAN NOT NULL DEFAULT false,
    "earSurgery" BOOLEAN NOT NULL DEFAULT false,
    "diabetes" BOOLEAN NOT NULL DEFAULT false,
    "cholesterol" BOOLEAN NOT NULL DEFAULT false,
    "highPressure" BOOLEAN NOT NULL DEFAULT false,
    "allergies" BOOLEAN NOT NULL DEFAULT false,
    "rhinitis" BOOLEAN NOT NULL DEFAULT false,
    "vertigo" BOOLEAN NOT NULL DEFAULT false,
    "tinnitus" BOOLEAN NOT NULL DEFAULT false,
    "headacheNoise" BOOLEAN NOT NULL DEFAULT false,
    "cloggedEar" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBackground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "nextMaintenanceAt" TIMESTAMP(3),
    "deviceUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientBackground_uuid_key" ON "PatientBackground"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBackground_patientUuid_key" ON "PatientBackground"("patientUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Maintenance_uuid_key" ON "Maintenance"("uuid");

-- CreateIndex
CREATE INDEX "Maintenance_patientUuid_idx" ON "Maintenance"("patientUuid");

-- CreateIndex
CREATE INDEX "Maintenance_tenantUuid_idx" ON "Maintenance"("tenantUuid");

-- CreateIndex
CREATE INDEX "Maintenance_nextMaintenanceAt_idx" ON "Maintenance"("nextMaintenanceAt");

-- AddForeignKey
ALTER TABLE "PatientBackground" ADD CONSTRAINT "PatientBackground_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
