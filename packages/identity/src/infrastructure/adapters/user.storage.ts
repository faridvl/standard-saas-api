import { Injectable } from '@nestjs/common';
import { Prisma, Status, User as PrismaUser } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserDomain, UserRole, UserStatus, UserStatusFilter } from '../../domain/types/user.types';
import { PaginatedResponse } from '../..//domain/types/pagination.types';

export type CreateUserParams = Omit<UserDomain, 'uuid' | 'createdAt'> & {
  password: string;
};

export type UpdateUserParams = {
  fullName?: string;
  phoneNumber?: string;
  specialty?: string;
  role?: UserRole;
  signatureUrl?: string | null;
  avatarUrl?: string | null;
};

const toUserStatus = (status: Status): UserStatus =>
  status === Status.ACTIVE ? UserStatus.ACTIVE : UserStatus.INACTIVE;

@Injectable()
export class UserStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<PrismaUser> {
    const client = tx || this.prisma;
    return client.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
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
      status: toUserStatus(user.status),
      tenantId: user.tenantId,
      tenantUuid: user.tenant.uuid,
      specialty: user.specialty,
    };

    return entity;
  }

  async findByUuid(uuid: string): Promise<UserDomain | null> {
    const record = await this.prisma.user.findUnique({
      where: { uuid },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByUuidAndTenant(uuid: string, tenantUUID: string): Promise<UserDomain | null> {
    const record = await this.prisma.user.findFirst({
      where: { uuid, tenantUUID },
    });

    return record ? this.toDomain(record) : null;
  }

  async update(uuid: string, data: UpdateUserParams): Promise<UserDomain> {
    const record = await this.prisma.user.update({
      where: { uuid },
      data: {
        ...(data.fullName !== undefined && { name: data.fullName }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.specialty !== undefined && { specialty: data.specialty }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.signatureUrl !== undefined && { signatureUrl: data.signatureUrl }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    return this.toDomain(record);
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
        status: Status.ACTIVE,
      },
    });

    return this.toDomain(record);
  }

  async updateStatus(uuid: string, status: UserStatus): Promise<void> {
    await this.prisma.user.update({
      where: { uuid },
      data: { status },
    });
  }

  async updatePassword(uuid: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { uuid },
      data: { password: hashedPassword },
    });
  }

  async findAllByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
    statusFilter: UserStatusFilter = UserStatusFilter.ALL,
  ): Promise<PaginatedResponse<UserDomain>> {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      tenantUUID,
      ...(statusFilter !== UserStatusFilter.ALL && { status: statusFilter }),
    };

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toDomain(record)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toDomain(record: PrismaUser): UserDomain {
    return {
      uuid: record.uuid,
      email: record.email,
      fullName: record.name,
      role: record.role as UserRole,
      tenantId: record.tenantId,
      tenantUUID: record.tenantUUID,
      specialty: record.specialty,
      avatarUrl: record.avatarUrl,
      signatureUrl: record.signatureUrl,
      phoneNumber: record.phoneNumber,
      createdAt: record.createdAt,
      status: toUserStatus(record.status),
    };
  }
}
