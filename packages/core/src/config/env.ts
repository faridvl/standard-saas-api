import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Buscamos el .env en la carpeta del microservicio que se está ejecutando
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default(7170),

  // AWS Configuration
  AWS_REGION: z.string().min(1, 'AWS_REGION es requerida'),

  // Table Names
  DYNAMO_TABLE_OWNERS: z.string().min(1, 'DYNAMO_TABLE_OWNERS es requerida'),
  // DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // Imprimimos un error amigable para saber qué falta en el .env local
  console.error('❌ Error en el .env del servicio actual:', _env.error.format());
  throw new Error('Variables de entorno inválidas');
}

export const env = _env.data;
