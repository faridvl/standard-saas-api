import { Injectable } from '@nestjs/common';
import { PatientActivity, Prisma } from '@prisma/client';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  PatientActivityAction,
  PatientActivityFilters,
  RecordPatientActivityInput,
} from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class PatientActivityStorage {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda una acción con el nombre del paciente tal como está ahora. Si el
   * paciente no existe en el tenant no se guarda nada: no hay a quién
   * atribuirle la acción.
   */
  async create(input: RecordPatientActivityInput): Promise<PatientActivity | null> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: input.patientUuid, tenantUuid: input.tenantUuid },
      select: { firstName: true, lastName: true },
    });
    if (!patient) return null;

    return await this.prisma.patientActivity.create({
      data: {
        tenantUuid: input.tenantUuid,
        patientUuid: input.patientUuid,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
        actorUuid: input.actorUuid,
        action: input.action,
        detail: (input.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  private async buildWhere(
    tenantUuid: string,
    filters: Omit<PatientActivityFilters, 'page' | 'limit'>,
  ): Promise<Prisma.PatientActivityWhereInput> {
    const where: Prisma.PatientActivityWhereInput = {
      tenantUuid,
      ...(filters.actorUuid && { actorUuid: filters.actorUuid }),
      ...(filters.actions?.length && { action: { in: filters.actions } }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to && { lt: filters.to }),
        },
      }),
    };

    if (filters.search) {
      // La cédula no vive en la bitácora: se buscan los pacientes que la
      // tengan y se suman a la búsqueda por el nombre guardado.
      const patientsByDocument = await this.prisma.patient.findMany({
        where: { tenantUuid, documentId: { contains: filters.search, mode: 'insensitive' } },
        select: { uuid: true },
      });
      where.OR = [
        { patientName: { contains: filters.search, mode: 'insensitive' } },
        { patientUuid: { in: patientsByDocument.map((patient) => patient.uuid) } },
      ];
    }

    return where;
  }

  async findAll(
    tenantUuid: string,
    filters: PatientActivityFilters,
  ): Promise<PaginatedResponse<PatientActivity>> {
    const where = await this.buildWhere(tenantUuid, filters);
    const skip = (filters.page - 1) * filters.limit;

    const [data, total] = await Promise.all([
      this.prisma.patientActivity.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.patientActivity.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /** Sede actual de cada paciente, en una sola consulta por página. */
  async findPatientBranches(
    tenantUuid: string,
    patientUuids: string[],
  ): Promise<Map<string, string | null>> {
    if (patientUuids.length === 0) return new Map();
    const rows = await this.prisma.patient.findMany({
      where: { tenantUuid, uuid: { in: patientUuids } },
      select: { uuid: true, branchUuid: true },
    });
    return new Map(rows.map((row) => [row.uuid, row.branchUuid]));
  }

  async findActorUuids(tenantUuid: string): Promise<string[]> {
    const rows = await this.prisma.patientActivity.findMany({
      where: { tenantUuid, actorUuid: { not: '' } },
      distinct: ['actorUuid'],
      select: { actorUuid: true },
    });
    return rows.map((row) => row.actorUuid);
  }

  async countByActionAndActor(
    tenantUuid: string,
    from?: Date,
    to?: Date,
  ): Promise<{ action: PatientActivityAction; actorUuid: string; count: number }[]> {
    const rows = await this.prisma.patientActivity.groupBy({
      by: ['action', 'actorUuid'],
      where: await this.buildWhere(tenantUuid, { from, to }),
      _count: { _all: true },
    });
    return rows.map((row) => ({
      action: row.action as PatientActivityAction,
      actorUuid: row.actorUuid,
      count: row._count._all,
    }));
  }
}
