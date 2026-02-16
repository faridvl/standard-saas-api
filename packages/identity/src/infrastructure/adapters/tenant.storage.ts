import { Injectable } from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { TenantDomain, TenantPlan } from '../../domain/types/auth.types';

@Injectable()
export class TenantStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TenantCreateInput, tx?: Prisma.TransactionClient): Promise<Tenant> {
    const client = tx || this.prisma;
    return client.tenant.create({ data });
  }

  async findByUuid(uuid: string): Promise<TenantDomain | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { uuid },
    });

    if (!record) return null;

    return {
      uuid: record.uuid,
      businessName: record.businessName,
      plan: TenantPlan.PREMIUM,
      createdAt: record.createdAt,
    };
  }
}
