import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserDomain, UserRole } from '../../domain/types/user.types';
import { PaginatedResponse } from '../..//domain/types/pagination.types';

//TODO(!): mover esto
export type CreateUserPersistence = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  tenantId: number;
  tenantUUID: string;
  specialty?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
};

export type CreateUserParams = Omit<UserDomain, 'uuid' | 'createdAt'> & {
  password: string;
};

@Injectable()
export class UserStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;
    return client.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });

    if (!user) return null;

    const entity: User = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      password: user.password,
      role: user.role,
      tenantId: user.tenantId,
      tenantUuid: user.tenant.uuid,
    };

    return entity;
  }
  async findByUuid(uuid: string): Promise<UserDomain | null> {
    const record = await this.prisma.user.findUnique({
      where: { uuid },
    });

    if (!record) return null;

    return {
      uuid: record.uuid,
      email: record.email,
      fullName: record.name,
      role: record.role as UserRole,
      tenantId: record.tenantId,
      tenantUUID: record.tenantUUID,
      specialty: record.specialty,
      avatarUrl: record.avatarUrl,
      phoneNumber: record.phoneNumber,
      createdAt: record.createdAt,
      status: record.status,
    };
  }

  async save(data: CreateUserParams): Promise<UserDomain> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.fullName,
        password: data.password,
        role: data.role,
        tenantId: data.tenantId,
        tenantUUID: data.tenantUUID,
        specialty: data.specialty,
        phoneNumber: data.phoneNumber,
        avatarUrl: data.avatarUrl,
        status: 'ACTIVE',
      },
    });

    return {
      uuid: record.uuid,
      email: record.email,
      fullName: record.name,
      role: record.role as UserRole,
      tenantId: record.tenantId,
      tenantUUID: record.tenantUUID,
      specialty: record.specialty,
      avatarUrl: record.avatarUrl,
      phoneNumber: record.phoneNumber,
      createdAt: record.createdAt,
      status: record.status,
    };
  }

  async findAllByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<UserDomain>> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantUUID },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { tenantUUID } }),
    ]);

    return {
      data: records.map((record) => ({
        uuid: record.uuid,
        email: record.email,
        fullName: record.name,
        role: record.role as UserRole,
        tenantId: record.tenantId,
        tenantUUID: record.tenantUUID,
        specialty: record.specialty,
        createdAt: record.createdAt,
        status: record.status,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
