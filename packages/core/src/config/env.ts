import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// SOLO cargar dotenv si NO estamos en Vercel (entorno local)
if (!process.env.VERCEL) {
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(7170), // Más limpio que el transform manual

  // Quitamos las variables de Dynamo que ya no usamos
  // AWS_REGION: z.string().optional(),

  JWT_SECRET: z.string().min(10),
  // Añade aquí IDENTITY_DB_URL si la usas en el PrismaService
});

// Usamos safeParse para evitar que la app explote si falta algo no crítico
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // En producción solo logueamos, no lanzamos Error para no matar la función
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error en el .env:', _env.error.format());
    throw new Error('Variables de entorno inválidas');
  } else {
    console.warn('⚠️ Faltan variables de entorno, pero intentando arrancar...');
  }
}

// Exportamos los datos validados o el process.env directamente como fallback
export const env = _env.success ? _env.data : (process.env as any);
