-- El contador de intentos de contacto se retira; sus eventos de bitácora ya escritos se conservan.
ALTER TABLE "Patient" DROP COLUMN "contactAttempts";
