-- Un usuario sin rol explícito ya no nace propietario.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
