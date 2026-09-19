import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserStorage {
  constructor(private readonly prisma: PrismaService) {}

  async findByUuid(uuid: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { uuid } });
  }

  async upsert(uuid: string, tenantUuid: string, fullName: string): Promise<User> {
    return await this.prisma.user.upsert({
      where: { uuid },
      create: { uuid, tenantUuid, fullName },
      update: { fullName },
    });
  }
}
