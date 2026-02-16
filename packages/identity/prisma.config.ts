// packages/identity/prisma/prisma.config.ts
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('IDENTITY_DB_URL'),
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
