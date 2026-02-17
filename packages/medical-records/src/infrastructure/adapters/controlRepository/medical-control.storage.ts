import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MedicalControl as PrismaMedicalControl, Prisma } from '@prisma/client';
import { MedicalControlEntity } from '@medical-records/domain/entities/medical-control.entity';
import { MedicalSpeciality } from '@medical-records/domain/types/medical-control-content.types';
import { MedicalRecordMigrator } from '@medical-records/domain/utils/medical-record-migrator.util';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

@Injectable()
export class MedicalControlStorage {
  private readonly CURRENT_VERSION = 1;
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: PrismaMedicalControl): MedicalControlEntity {
    const speciality = record.speciality as MedicalSpeciality;

    const migratedFindings = MedicalRecordMigrator.apply(
      record.findings,
      speciality,
      record.schemaVersion,
      this.CURRENT_VERSION,
    );

    return {
      uuid: record.uuid,
      doctorUuid: record.userUUID,
      tenantUuid: record.tenantUUID,
      createdAt: record.createdAt.toISOString(),
      header: {
        patientUUID: record.patientUUID,
        appointmentUUID: record.appointmentUUID,
        speciality: speciality,
        schemaVersion: record.schemaVersion,
      },
      clinicalData: {
        findings: migratedFindings,
        diagnosis: record.diagnosis,
      },
    };
  }

  async findAllByPatient(
    patientUUID: string,
    tenantUUID: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<MedicalControlEntity>> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.medicalControl.findMany({
        where: {
          patientUUID,
          tenantUUID,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.medicalControl.count({
        where: { patientUUID, tenantUUID },
      }),
    ]);

    return {
      data: records.map((record) => this.mapToEntity(record)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async save(
    data: {
      patientUuid: string;
      doctorUuid: string;
      appointmentUuid?: string | null;
      speciality: MedicalSpeciality;
      findings: any;
      diagnosis: string;
      version: number;
    },
    tenantUuid: string,
  ): Promise<MedicalControlEntity> {
    const record = await this.prisma.medicalControl.create({
      data: {
        patientUUID: data.patientUuid,
        userUUID: data.doctorUuid,
        tenantUUID: tenantUuid,
        appointmentUUID: data.appointmentUuid,
        speciality: data.speciality,
        findings: data.findings as Prisma.InputJsonValue,
        diagnosis: data.diagnosis,
        schemaVersion: data.version,
      },
    });

    return this.mapToEntity(record);
  }

  async findOneByUuid(uuid: string, tenantUuid: string): Promise<MedicalControlEntity | null> {
    const record = await this.prisma.medicalControl.findFirst({
      where: {
        uuid: uuid,
        tenantUUID: tenantUuid,
      },
    });

    if (!record) return null;

    return this.mapToEntity(record);
  }
}
