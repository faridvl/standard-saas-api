-- El pre-registro rápido desde la agenda crea al paciente sin fecha de nacimiento.
ALTER TABLE "Patient" ALTER COLUMN "birthDate" DROP NOT NULL;
