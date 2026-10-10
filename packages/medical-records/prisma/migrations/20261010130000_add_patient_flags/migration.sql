-- Indicadores del paciente que se prenden y apagan: audífonos en laboratorio
-- y garantía activa. Guardan desde cuándo están prendidos; null = apagado,
-- que es como quedan los pacientes existentes.
ALTER TABLE "Patient" ADD COLUMN "hearingAidsInLabSince" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "warrantyActiveSince" TIMESTAMP(3);
