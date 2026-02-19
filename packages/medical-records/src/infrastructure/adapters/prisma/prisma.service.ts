import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'; // O la ruta que definiste en el output
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.MEDICAL_RECORDS_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 1000,
    });

    const adapter = new PrismaPg(pool);
    // Añadimos configuración de log para ver qué hace Prisma en Vercel
    super({
      adapter,
      log: ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    // Eliminamos el await this.$connect() para evitar bloquear el arranque
    // La conexión se hará bajo demanda en la primera query
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
