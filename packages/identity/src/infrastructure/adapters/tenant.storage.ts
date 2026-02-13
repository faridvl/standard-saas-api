import { Injectable } from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class TenantStorage {
  constructor(private readonly prisma: PrismaService) {}

  // Acepta un 'tx' opcional. Si viene, lo usa; si no, usa el cliente estándar.
  async create(data: Prisma.TenantCreateInput, tx?: Prisma.TransactionClient): Promise<Tenant> {
    const client = tx || this.prisma;
    return client.tenant.create({ data });
  }
}
