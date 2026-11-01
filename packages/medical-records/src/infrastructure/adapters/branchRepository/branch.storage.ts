import { Injectable } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchStorage {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantUuid: string): Promise<Branch[]> {
    return await this.prisma.branch.findMany({
      where: { tenantUuid, isActive: true },
      orderBy: { name: 'asc' },
    });
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
}
