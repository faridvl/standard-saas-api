// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { PatientEntity } from 'src/domain/entities/patient.entity';

// @Injectable()
// export class PatientStorage {
//   constructor(private readonly prisma: PrismaService) {}

//   async save(patient: PatientEntity): Promise<PatientEntity> {
//     const created = await this.prisma.patient.create({
//       data: {
//         firstName: patient.firstName,
//         lastName: patient.lastName,
//         phone: patient.phone,
//         address: patient.address,
//         birthDate: patient.birthDate,
//         tenantId: patient.tenantId,
//         tenantUuid: patient.tenantUuid,
//         createdBy: patient.createdBy,
//       },
//     });

//     return {
//       uuid: created.uuid,
//       firstName: created.firstName,
//       lastName: created.lastName,
//       phone: created.phone ?? undefined,
//       address: created.address ?? undefined,
//       birthDate: created.birthDate,
//       tenantId: created.tenantId,
//       tenantUuid: created.tenantUuid,
//       createdBy: created.createdBy,
//       createdAt: created.createdAt,
//     };
//   }
// }

import { Injectable } from '@nestjs/common';
import { Prisma, Patient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { UpdatePatientDto } from '@medical-records/app/dtos/update-patient.dto';

@Injectable()
export class PatientStorage {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    data: Prisma.PatientUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Patient> {
    const client: Prisma.TransactionClient | PrismaService = tx || this.prisma;

    return client.patient.create({ data });
  }

  async findByUuid(uuid: string, tenantUuid: string): Promise<Patient | null> {
    return await this.prisma.patient.findFirst({
      where: {
        uuid: uuid,
        tenantUuid: tenantUuid,
      },
    });
  }

  async update(uuid: string, tenantUuid: string, dto: UpdatePatientDto): Promise<Patient> {
    return await this.prisma.patient.update({
      where: { uuid },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.bloodType !== undefined && { bloodType: dto.bloodType }),
        ...(dto.linkedProductUuid !== undefined && { linkedProductUuid: dto.linkedProductUuid }),
        ...(dto.documentId !== undefined && { documentId: dto.documentId }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.branchUuid !== undefined && { branchUuid: dto.branchUuid }),
      },
    });
  }

  async findByDocumentId(
    documentId: string,
    tenantUuid: string,
    excludeUuid?: string,
  ): Promise<Patient | null> {
    return await this.prisma.patient.findFirst({
      where: {
        documentId,
        tenantUuid,
        isActive: true,
        ...(excludeUuid ? { uuid: { not: excludeUuid } } : {}),
      },
    });
  }

  async softDelete(uuid: string, tenantUuid: string): Promise<Patient> {
    return await this.prisma.patient.update({
      where: { uuid },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  /** Próxima cita CONFIRMED y futura de cada paciente (una fila por patientUUID, la más cercana). */
  private async findNextAppointmentsByPatient(
    tenantUUID: string,
    patientUUIDs: string[],
  ): Promise<Map<string, { startTime: Date; typeName: string | null }>> {
    if (patientUUIDs.length === 0) return new Map();

    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantUUID,
        patientUUID: { in: patientUUIDs },
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
      },
      distinct: ['patientUUID'],
      orderBy: [{ patientUUID: 'asc' }, { startTime: 'asc' }],
      select: {
        patientUUID: true,
        startTime: true,
        appointmentType: { select: { name: true } },
      },
    });

    return new Map(
      rows.map((row) => [
        row.patientUUID,
        { startTime: row.startTime, typeName: row.appointmentType?.name ?? null },
      ]),
    );
  }

  /** UUIDs de pacientes cuya próxima cita CONFIRMED cae dentro del mes dado (YYYY-MM). */
  private async findPatientUuidsWithNextAppointmentInMonth(
    tenantUUID: string,
    month: string,
  ): Promise<string[]> {
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantUUID,
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
      },
      distinct: ['patientUUID'],
      orderBy: [{ patientUUID: 'asc' }, { startTime: 'asc' }],
      select: { patientUUID: true, startTime: true },
    });

    return rows
      .filter((row) => row.startTime >= monthStart && row.startTime < monthEnd)
      .map((row) => row.patientUUID);
  }

  async findAllByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
    includeInactive = false,
    search?: string,
    nextAppointmentMonth?: string,
  ): Promise<
    PaginatedResponse<
      Patient & { nextAppointmentAt: Date | null; nextAppointmentType: string | null }
    >
  > {
    const skip = (page - 1) * limit;
    const where: Prisma.PatientWhereInput = {
      tenantUuid: tenantUUID,
      ...(includeInactive ? {} : { isActive: true }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { documentId: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    if (nextAppointmentMonth) {
      const matchingUuids = await this.findPatientUuidsWithNextAppointmentInMonth(
        tenantUUID,
        nextAppointmentMonth,
      );

      const records = await this.prisma.patient.findMany({
        where: { ...where, uuid: { in: matchingUuids } },
        orderBy: { createdAt: 'desc' },
      });

      const nextAppointments = await this.findNextAppointmentsByPatient(
        tenantUUID,
        records.map((record) => record.uuid),
      );

      const data = records
        .map((record) => ({
          ...record,
          nextAppointmentAt: nextAppointments.get(record.uuid)?.startTime ?? null,
          nextAppointmentType: nextAppointments.get(record.uuid)?.typeName ?? null,
        }))
        // Con el filtro de mes activo se ordena por próxima cita (la más
        // cercana primero); sin filtro se mantiene el orden por createdAt.
        .sort(
          (a, b) => (a.nextAppointmentAt?.getTime() ?? 0) - (b.nextAppointmentAt?.getTime() ?? 0),
        );

      return {
        data,
        meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 },
      };
    }

    const [records, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const nextAppointments = await this.findNextAppointmentsByPatient(
      tenantUUID,
      records.map((record) => record.uuid),
    );

    const data = records.map((record) => ({
      ...record,
      nextAppointmentAt: nextAppointments.get(record.uuid)?.startTime ?? null,
      nextAppointmentType: nextAppointments.get(record.uuid)?.typeName ?? null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
