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

  async save(data: Prisma.PatientCreateInput, tx?: Prisma.TransactionClient): Promise<Patient> {
    const client = tx || (this.prisma as any);

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
      },
    });
  }

  async softDelete(uuid: string, tenantUuid: string): Promise<Patient> {
    return await this.prisma.patient.update({
      where: { uuid },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async findAllByTenant(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
    includeInactive = false,
  ): Promise<PaginatedResponse<Patient>> {
    const skip = (page - 1) * limit;
    const where: Prisma.PatientWhereInput = {
      tenantUuid: tenantUUID,
      ...(includeInactive ? {} : { isActive: true }),
    };

    const [records, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
