-- Catalogo global de tipos de audiometria. Las filas existentes quedan como CLINICAL por el DEFAULT.

-- CreateTable
CREATE TABLE "AudiometryType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudiometryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudiometryType_code_key" ON "AudiometryType"("code");

-- Los tipos deben existir antes de la llave foranea.
INSERT INTO "AudiometryType" ("code", "name", "sortOrder")
VALUES ('CLINICAL', 'Clínica', 1), ('SCREENING', 'De rastreo', 2);

-- AlterTable: el DEFAULT rellena las audiometrias ya guardadas como clinicas.
ALTER TABLE "PatientAudiometryEntry" ADD COLUMN     "typeCode" TEXT NOT NULL DEFAULT 'CLINICAL';

-- AddForeignKey
ALTER TABLE "PatientAudiometryEntry" ADD CONSTRAINT "PatientAudiometryEntry_typeCode_fkey" FOREIGN KEY ("typeCode") REFERENCES "AudiometryType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
