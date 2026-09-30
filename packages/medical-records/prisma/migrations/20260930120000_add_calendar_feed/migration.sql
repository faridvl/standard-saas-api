-- Enlace de calendario suscrito por usuario (webcal): la app de calendario
-- del teléfono lee las citas de la clínica con este token. Tabla nueva, no
-- toca datos existentes.
CREATE TABLE "CalendarFeed" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarFeed_uuid_key" ON "CalendarFeed"("uuid");
CREATE UNIQUE INDEX "CalendarFeed_token_key" ON "CalendarFeed"("token");
CREATE UNIQUE INDEX "CalendarFeed_userUuid_key" ON "CalendarFeed"("userUuid");
CREATE INDEX "CalendarFeed_tenantUuid_idx" ON "CalendarFeed"("tenantUuid");
