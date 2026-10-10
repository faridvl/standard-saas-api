-- Sedes quitadas del calendario suscrito de cada usuario. Columna nueva con
-- valor por defecto: no toca datos existentes.
ALTER TABLE "CalendarFeed" ADD COLUMN "removedBranchUuids" TEXT[] DEFAULT ARRAY[]::TEXT[];
