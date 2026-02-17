-- CreateTable
CREATE TABLE "MedicalControl" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUUID" TEXT NOT NULL,
    "userUUID" TEXT NOT NULL,
    "tenantUUID" TEXT NOT NULL,
    "appointmentUUID" TEXT,
    "speciality" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalControl_uuid_key" ON "MedicalControl"("uuid");

-- CreateIndex
CREATE INDEX "MedicalControl_patientUUID_idx" ON "MedicalControl"("patientUUID");

-- CreateIndex
CREATE INDEX "MedicalControl_tenantUUID_idx" ON "MedicalControl"("tenantUUID");
