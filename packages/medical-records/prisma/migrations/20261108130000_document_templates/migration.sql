-- Plantillas de documento por clínica: markdown con variables {{clave}}, sin borrado.

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUuid" TEXT NOT NULL,
    "updatedByUuid" TEXT NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_uuid_key" ON "DocumentTemplate"("uuid");

-- Nombre único por clínica sin distinguir mayúsculas (Prisma no expresa lower() en el schema).
CREATE UNIQUE INDEX "DocumentTemplate_tenantUuid_name_ci_key" ON "DocumentTemplate"("tenantUuid", lower("name"));
