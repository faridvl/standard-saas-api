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

  async update(
    uuid: string,
    data: { businessName?: string; businessType?: string; logoUrl?: string | null },
  ): Promise<TenantDomain> {
    const record = await this.prisma.tenant.update({
      where: { uuid },
      data: {
        ...(data.businessName !== undefined && { businessName: data.businessName }),
        ...(data.businessType !== undefined && { businessType: data.businessType }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
    });

    return {
      uuid: record.uuid,
      businessName: record.businessName,
      businessType: record.businessType ?? undefined,
      logoUrl: record.logoUrl ?? undefined,
      plan: (record.plan as TenantPlan) ?? TenantPlan.FREE,
      createdAt: record.createdAt,
    };
  }

  async findByUuid(uuid: string): Promise<TenantDomain | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { uuid },
    });

    if (!record) return null;

    return {
      uuid: record.uuid,
      businessName: record.businessName,
      businessType: record.businessType ?? undefined,
      logoUrl: record.logoUrl ?? undefined,
      plan: (record.plan as TenantPlan) ?? TenantPlan.FREE,
      createdAt: record.createdAt,
    };
  }
}
