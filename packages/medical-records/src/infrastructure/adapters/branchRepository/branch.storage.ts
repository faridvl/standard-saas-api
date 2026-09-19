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
}
