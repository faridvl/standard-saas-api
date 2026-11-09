import { Injectable } from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { TenantDomain, TenantPlan } from '../../domain/types/auth.types';
import { ClinicContactData, ClinicRecord } from '../../domain/types/clinic.types';

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

  async findClinicByUuid(uuid: string): Promise<ClinicRecord | null> {
    const record = await this.prisma.tenant.findUnique({
      where: { uuid },
      select: {
        businessName: true,
        logoKey: true,
        logoUrl: true,
        phone: true,
        email: true,
        address: true,
      },
    });
    return record ?? null;
  }

  async updateClinicContact(uuid: string, data: ClinicContactData): Promise<ClinicRecord | null> {
    const result = await this.prisma.tenant.updateMany({
      where: { uuid },
      data: {
        ...(data.name !== undefined && { businessName: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
      },
    });
    if (result.count === 0) return null;
    return this.findClinicByUuid(uuid);
  }

  /** Guarda la key del logo (o la quita con null) y descarta la URL heredada. */
  async setClinicLogoKey(uuid: string, logoKey: string | null): Promise<ClinicRecord | null> {
    const result = await this.prisma.tenant.updateMany({
      where: { uuid },
      data: { logoKey, logoUrl: null },
    });
    if (result.count === 0) return null;
    return this.findClinicByUuid(uuid);
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
      logoKey: record.logoKey,
      plan: (record.plan as TenantPlan) ?? TenantPlan.FREE,
      createdAt: record.createdAt,
    };
  }
}
