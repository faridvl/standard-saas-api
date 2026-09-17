import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchStorage {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantUuid: string) {
    return await this.prisma.branch.findMany({
      where: { tenantUuid, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
