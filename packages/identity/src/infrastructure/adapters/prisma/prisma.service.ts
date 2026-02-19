import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.IDENTITY_DB_URL,
      // Configuraciones recomendadas para Serverless:
      max: 1, // Limita a 1 conexión por instancia de función
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    // Eliminamos el await this.$connect() para evitar bloquear el arranque
    // La conexión se hará bajo demanda en la primera query
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
