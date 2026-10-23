-- Historia clínica con preguntas configurables: respuestas por id y la copia de las
-- preguntas al llenarla. Null en las existentes, que se siguen leyendo de las columnas.
ALTER TABLE "PatientBackground" ADD COLUMN "answers" JSONB;
ALTER TABLE "PatientBackground" ADD COLUMN "templateSnapshot" JSONB;
