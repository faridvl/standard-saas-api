-- Las notas de Control de evolución pasan de 500 a 2500 caracteres; solo agranda la columna.
ALTER TABLE "PatientNote" ALTER COLUMN "text" TYPE VARCHAR(2500);
