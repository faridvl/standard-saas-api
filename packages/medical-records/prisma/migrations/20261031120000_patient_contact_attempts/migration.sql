-- Intentos de contacto: veces que se llamó al paciente (0 a 3), subido y reiniciado a mano.
ALTER TABLE "Patient" ADD COLUMN "contactAttempts" INTEGER NOT NULL DEFAULT 0;
