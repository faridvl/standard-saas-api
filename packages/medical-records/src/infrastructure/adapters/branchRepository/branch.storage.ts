import { Injectable } from '@nestjs/common';
import { BranchColor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';

const BRANCH_SELECT = {
  id: true,
  uuid: true,
  tenantUuid: true,
  name: true,
  phone: true,
  address: true,
  color: true,
  isActive: true,
  createdAt: true,
} as const;

export interface BranchCreateData {
  name: string;
  color: BranchColor;
  phone?: string | null;
  address?: string | null;
}

export interface BranchUpdateData {
  name?: string;
  phone?: string | null;
  address?: string | null;
  color?: BranchColor;
  isActive?: boolean;
}

@Injectable()
export class BranchStorage {
  constructor(private readonly prisma: PrismaService) {}

  /** Todas las sedes de la clínica, activas e inactivas; el orden final lo da el use case. */
  async findAll(tenantUuid: string): Promise<BranchEntity[]> {
    return await this.prisma.branch.findMany({
      where: { tenantUuid },
      select: BRANCH_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findByUuid(tenantUuid: string, uuid: string): Promise<BranchEntity | null> {
    return await this.prisma.branch.findFirst({
      where: { uuid, tenantUuid },
      select: BRANCH_SELECT,
    });
  }

  async create(tenantUuid: string, data: BranchCreateData): Promise<BranchEntity> {
    return await this.prisma.branch.create({
      data: { ...data, tenantUuid },
      select: BRANCH_SELECT,
    });
  }

  /** Filtra por clínica también al escribir; null si la sede no es de la clínica. */
  async update(
    tenantUuid: string,
    uuid: string,
    data: BranchUpdateData,
  ): Promise<BranchEntity | null> {
    const { count } = await this.prisma.branch.updateMany({ where: { uuid, tenantUuid }, data });
    if (count === 0) return null;
    return await this.findByUuid(tenantUuid, uuid);
  }

  /** De las sedes pedidas, las que existen en la clínica. */
  async findUuidsInTenant(tenantUuid: string, uuids: string[]): Promise<string[]> {
    if (uuids.length === 0) return [];
    const rows = await this.prisma.branch.findMany({
      where: { tenantUuid, uuid: { in: uuids } },
      select: { uuid: true },
    });
    return rows.map((row) => row.uuid);
  }

  /** De las sedes pedidas, las de la clínica que están desactivadas. */
  async findInactiveUuids(tenantUuid: string, uuids: string[]): Promise<string[]> {
    if (uuids.length === 0) return [];
    const rows = await this.prisma.branch.findMany({
      where: { tenantUuid, uuid: { in: uuids }, isActive: false },
      select: { uuid: true },
    });
    return rows.map((row) => row.uuid);
  }
}
