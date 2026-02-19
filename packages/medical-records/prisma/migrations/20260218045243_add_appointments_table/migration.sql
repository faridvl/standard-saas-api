/*
  Warnings:

  - A unique constraint covering the columns `[appointmentUUID]` on the table `MedicalControl` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "AppointmentType" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER,
    "color" TEXT,
    "tenantUUID" TEXT NOT NULL,

    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "patientUUID" TEXT NOT NULL,
    "userUUID" TEXT NOT NULL,
    "tenantUUID" TEXT NOT NULL,
    "typeUUID" TEXT NOT NULL,
    "speciality" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentType_uuid_key" ON "AppointmentType"("uuid");

-- CreateIndex
CREATE INDEX "AppointmentType_tenantUUID_idx" ON "AppointmentType"("tenantUUID");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_uuid_key" ON "Appointment"("uuid");

-- CreateIndex
CREATE INDEX "Appointment_patientUUID_idx" ON "Appointment"("patientUUID");

-- CreateIndex
CREATE INDEX "Appointment_tenantUUID_idx" ON "Appointment"("tenantUUID");

-- CreateIndex
CREATE INDEX "Appointment_userUUID_idx" ON "Appointment"("userUUID");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalControl_appointmentUUID_key" ON "MedicalControl"("appointmentUUID");

-- AddForeignKey
ALTER TABLE "MedicalControl" ADD CONSTRAINT "MedicalControl_patientUUID_fkey" FOREIGN KEY ("patientUUID") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalControl" ADD CONSTRAINT "MedicalControl_appointmentUUID_fkey" FOREIGN KEY ("appointmentUUID") REFERENCES "Appointment"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientUUID_fkey" FOREIGN KEY ("patientUUID") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_typeUUID_fkey" FOREIGN KEY ("typeUUID") REFERENCES "AppointmentType"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
