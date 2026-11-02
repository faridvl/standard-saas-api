import { Injectable } from '@nestjs/common';
import { PatientPhysicalExam } from '@prisma/client';
import {
  PatientPhysicalExamEntity,
  PatientPhysicalExamWriteData,
} from '@medical-records/domain/entities/patient-physical-exam.entity';
import { CreatePatientOtoscopyEntryData } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientPhysicalExamStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: PatientPhysicalExam): PatientPhysicalExamEntity {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      otoscopyRight: record.otoscopyRight,
      otoscopyLeft: record.otoscopyLeft,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      createdByUuid: record.createdByUuid,
      updatedByUuid: record.updatedByUuid,
    };
  }

  // PatientPhysicalExam no tiene tenantUuid: la pertenencia a la clínica se
  // comprueba siempre sobre el paciente.
  async patientExists(patientUuid: string, tenantUuid: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid },
      select: { id: true },
    });
    return patient !== null;
  }

  async findByPatient(patientUuid: string): Promise<PatientPhysicalExamEntity | null> {
    const record = await this.prisma.patientPhysicalExam.findUnique({ where: { patientUuid } });
    return record ? this.mapToEntity(record) : null;
  }

  // Con `historyEntry`, la otoscopia también queda como un registro nuevo del historial,
  // en la misma transacción: o quedan las dos cosas o ninguna.
  async upsert(
    patientUuid: string,
    actorUuid: string,
    data: PatientPhysicalExamWriteData,
    historyEntry: CreatePatientOtoscopyEntryData | null,
  ): Promise<PatientPhysicalExamEntity> {
    const upsert = this.prisma.patientPhysicalExam.upsert({
      where: { patientUuid },
      create: { patientUuid, ...data, createdByUuid: actorUuid, updatedByUuid: actorUuid },
      update: { ...data, updatedByUuid: actorUuid },
    });
    if (!historyEntry) {
      return this.mapToEntity(await upsert);
    }
    const [record] = await this.prisma.$transaction([
      upsert,
      this.prisma.patientOtoscopyEntry.create({ data: historyEntry }),
    ]);
    return this.mapToEntity(record);
  }
}
