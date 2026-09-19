-- Registra quién subió cada documento del paciente, igual que PatientNote.authorUuid.
-- Default '' para no romper los documentos ya existentes (no tienen autor conocido).
ALTER TABLE "PatientDocument" ADD COLUMN "uploadedByUuid" TEXT NOT NULL DEFAULT '';
