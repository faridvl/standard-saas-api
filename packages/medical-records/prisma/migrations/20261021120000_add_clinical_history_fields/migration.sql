-- Historia clínica: mareo, tonalidad del acúfeno, otoscopia por oído y
-- quién la llenó/modificó. Los antecedentes existentes quedan sin autor y con
-- createdAt = momento de la migración (no se sabe cuándo se crearon).
ALTER TABLE "PatientBackground" ADD COLUMN "dizziness" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PatientBackground" ADD COLUMN "tinnitusTone" TEXT;
ALTER TABLE "PatientBackground" ADD COLUMN "otoscopyRight" TEXT;
ALTER TABLE "PatientBackground" ADD COLUMN "otoscopyLeft" TEXT;
ALTER TABLE "PatientBackground" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PatientBackground" ADD COLUMN "createdByUuid" TEXT;
ALTER TABLE "PatientBackground" ADD COLUMN "updatedByUuid" TEXT;
