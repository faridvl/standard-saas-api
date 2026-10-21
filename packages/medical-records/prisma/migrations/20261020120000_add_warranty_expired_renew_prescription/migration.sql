-- Indicadores "garantía vencida" y "renovar receta": desde cuándo están
-- prendidos; null = apagado, que es como quedan los pacientes existentes.
ALTER TABLE "Patient" ADD COLUMN "warrantyExpiredSince" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "renewPrescriptionSince" TIMESTAMP(3);
-- Documento del expediente elegido como garantía; null = ninguno.
ALTER TABLE "Patient" ADD COLUMN "warrantyDocumentUuid" TEXT;
