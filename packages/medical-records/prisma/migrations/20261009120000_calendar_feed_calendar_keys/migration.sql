-- Un calendario ahora es una sede o una sede + tipo de cita: lo quitado se
-- guarda por clave ("sede" o "sede:tipo"), y se anota cuándo el teléfono pidió
-- cada uno para saber cuáles ya están agregados. No borra datos.
ALTER TABLE "CalendarFeed" RENAME COLUMN "removedBranchUuids" TO "removedCalendarKeys";
ALTER TABLE "CalendarFeed" ADD COLUMN "fetchedCalendars" JSONB NOT NULL DEFAULT '{}';
