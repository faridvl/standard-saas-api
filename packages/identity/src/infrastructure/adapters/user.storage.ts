import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Status, User as PrismaUser, UserAudit as PrismaUserAudit } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { User } from '../../domain/entities/user.entity';
import {
  ProfessionalTitle,
  Specialty,
  UserAuditChange,
  UserAuditEntry,
  UserAuditField,
  LAST_OWNER_MESSAGE,
  UserDomain,
  UserRole,
  UserStatus,
  UserStatusFilter,
} from '../../domain/types/user.types';
import { PaginatedResponse } from '../..//domain/types/pagination.types';

export type CreateUserParams = Omit<UserDomain, 'uuid' | 'createdAt'> & {
  password: string;
};

export type UpdateUserParams = {
  fullName?: string;
  phoneNumber?: string;
  role?: UserRole;
  attendsPatients?: boolean;
  specialties?: Specialty[];
  professionalTitle?: ProfessionalTitle | null;
  licenseNumber?: string | null;
  signatureUrl?: string | null;
  avatarUrl?: string | null;
};

export type UserCredentials = {
  uuid: string;
  fullName: string;
  password: string;
  status: UserStatus;
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
      attendsPatients: user.attendsPatients,
      specialties: user.specialties,
      professionalTitle: user.professionalTitle,
      licenseNumber: user.licenseNumber,
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

  /** Cambio y bitácora en la misma transacción: no queda un cambio sin su registro. */
  async update(
    uuid: string,
    data: UpdateUserParams,
    audit: UserAuditChange[] = [],
    requireOtherOwner = false,
  ): Promise<UserDomain> {
    return this.prisma.$transaction(async (tx) => {
      if (requireOtherOwner) await this.assertOtherOwnerLocked(tx, uuid);
      const record = await tx.user.update({
        where: { uuid },
        data: {
          ...(data.fullName !== undefined && { name: data.fullName }),
          ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.attendsPatients !== undefined && { attendsPatients: data.attendsPatients }),
          ...(data.specialties !== undefined && { specialties: data.specialties }),
          ...(data.professionalTitle !== undefined && {
            professionalTitle: data.professionalTitle,
          }),
          ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
          ...(data.signatureUrl !== undefined && { signatureUrl: data.signatureUrl }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        },
      });
      await this.writeAudit(tx, record, audit);
      return this.toDomain(record);
    });
  }

  async save(data: CreateUserParams, audit: UserAuditChange[] = []): Promise<UserDomain> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.user.create({
        data: {
          email: data.email,
          name: data.fullName,
          password: data.password,
          role: data.role ?? UserRole.RECEPTION,
          tenantId: data.tenantId,
          tenantUUID: data.tenantUUID,
          attendsPatients: data.attendsPatients,
          specialties: data.specialties,
          phoneNumber: data.phoneNumber,
          avatarUrl: data.avatarUrl,
          status: Status.ACTIVE,
        },
      });
      await this.writeAudit(tx, record, audit);
      return this.toDomain(record);
    });
  }

  async updateStatus(uuid: string, status: UserStatus, requireOtherOwner = false): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (requireOtherOwner) await this.assertOtherOwnerLocked(tx, uuid);
      await tx.user.update({ where: { uuid }, data: { status } });
    });
  }

  /**
   * Bloquea (FOR UPDATE) a los propietarios activos de la clínica del usuario y falla si, sin él,
   * no queda ninguno: dos propietarios que se quitan el acceso a la vez se serializan aquí.
   */
  private async assertOtherOwnerLocked(tx: Prisma.TransactionClient, uuid: string): Promise<void> {
    const target = await tx.user.findUnique({ where: { uuid }, select: { tenantUUID: true } });
    if (!target?.tenantUUID) return;
    const owners = await tx.$queryRaw<{ uuid: string }[]>`
      SELECT "uuid" FROM "User"
      WHERE "tenantUUID" = ${target.tenantUUID} AND "role" = ${UserRole.OWNER} AND "status" = 'ACTIVE'::"Status"
      FOR UPDATE`;
    if (!owners.some((owner) => owner.uuid !== uuid)) {
      throw new BadRequestException(LAST_OWNER_MESSAGE);
    }
  }

  async updatePassword(
    uuid: string,
    hashedPassword: string,
    audit: UserAuditChange[] = [],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { uuid },
        data: { password: hashedPassword },
      });
      await this.writeAudit(tx, record, audit);
    });
  }

  /** Datos mínimos para verificar la contraseña propia; el hash no sale de este flujo. */
  async findCredentialsByUuidAndTenant(
    uuid: string,
    tenantUUID: string,
  ): Promise<UserCredentials | null> {
    const record = await this.prisma.user.findFirst({
      where: { uuid, tenantUUID },
      select: { uuid: true, name: true, password: true, status: true },
    });
    if (!record) return null;
    return {
      uuid: record.uuid,
      fullName: record.name,
      password: record.password,
      status: toUserStatus(record.status),
    };
  }

  /** Propietarios activos de la clínica, sin contar a `excludingUuid`. */
  async countActiveOwners(tenantUUID: string, excludingUuid?: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        tenantUUID,
        role: UserRole.OWNER,
        status: Status.ACTIVE,
        ...(excludingUuid && { uuid: { not: excludingUuid } }),
      },
    });
  }

  async findAuditByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 20,
    targetUuid?: string,
  ): Promise<PaginatedResponse<UserAuditEntry>> {
    const where: Prisma.UserAuditWhereInput = { tenantUUID, ...(targetUuid && { targetUuid }) };
    const [records, total] = await Promise.all([
      this.prisma.userAudit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userAudit.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toAuditEntry(record)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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

  private async writeAudit(
    tx: Prisma.TransactionClient,
    target: PrismaUser,
    changes: UserAuditChange[],
  ): Promise<void> {
    if (changes.length === 0 || !target.tenantUUID) return;
    await tx.userAudit.createMany({
      data: changes.map((change) => ({
        tenantUUID: target.tenantUUID as string,
        actorUuid: change.actorUuid,
        actorName: change.actorName,
        targetUuid: target.uuid,
        targetName: target.name,
        field: change.field,
        before: change.before,
        after: change.after,
      })),
    });
  }

  private toAuditEntry(record: PrismaUserAudit): UserAuditEntry {
    return {
      uuid: record.uuid,
      actorUuid: record.actorUuid,
      actorName: record.actorName,
      targetUuid: record.targetUuid,
      targetName: record.targetName,
      field: record.field as UserAuditField,
      before: record.before,
      after: record.after,
      createdAt: record.createdAt,
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
      attendsPatients: record.attendsPatients,
      specialties: record.specialties as Specialty[],
      professionalTitle: record.professionalTitle as ProfessionalTitle | null,
      licenseNumber: record.licenseNumber,
      avatarUrl: record.avatarUrl,
      signatureUrl: record.signatureUrl,
      phoneNumber: record.phoneNumber,
      createdAt: record.createdAt,
      status: toUserStatus(record.status),
    };
  }
}
