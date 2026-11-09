-- Corrección de un registro de Preguntas: quién y cuándo (solo el mismo día en que se llenó).
ALTER TABLE "PatientQuestionnaireEntry" ADD COLUMN "updatedAt" TIMESTAMP(3),
ADD COLUMN "updatedByUuid" TEXT;
