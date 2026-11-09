import { Injectable } from '@nestjs/common';
import { PatientBackground, Prisma } from '@prisma/client';
import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';
import { PrismaService } from '../prisma/prisma.service';
import {
  PatientBackgroundAnswer,
  PatientBackgroundEntity,
  PatientBackgroundWriteData,
} from '@medical-records/domain/entities/patient-background.entity';

@Injectable()
export class PatientBackgroundStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: PatientBackground): PatientBackgroundEntity {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      earInfections: record.earInfections,
      nasalSurgery: record.nasalSurgery,
      throatSurgery: record.throatSurgery,
      earSurgery: record.earSurgery,
      diabetes: record.diabetes,
      cholesterol: record.cholesterol,
      highPressure: record.highPressure,
      allergies: record.allergies,
      rhinitis: record.rhinitis,
      vertigo: record.vertigo,
      tinnitus: record.tinnitus,
      headacheNoise: record.headacheNoise,
      cloggedEar: record.cloggedEar,
      dizziness: record.dizziness,
      tinnitusTone: record.tinnitusTone,
      otoscopyRight: record.otoscopyRight,
      otoscopyLeft: record.otoscopyLeft,
      notes: record.notes,
      answers: (record.answers as Record<string, PatientBackgroundAnswer> | null) ?? null,
      templateSnapshot: (record.templateSnapshot as unknown as ClinicalFieldDefinition[] | null) ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      createdByUuid: record.createdByUuid,
      updatedByUuid: record.updatedByUuid,
    };
  }

  // PatientBackground no tiene tenantUuid: la pertenencia a la clínica se
  // comprueba siempre sobre el paciente.
  async patientExists(patientUuid: string, tenantUuid: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid },
      select: { id: true },
    });
    return patient !== null;
  }

  async findByPatient(patientUuid: string): Promise<PatientBackgroundEntity | null> {
    const record = await this.prisma.patientBackground.findUnique({
      where: { patientUuid },
    });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async upsert(
    patientUuid: string,
    actorUuid: string,
    data: PatientBackgroundWriteData,
  ): Promise<PatientBackgroundEntity> {
    // Prisma no acepta null en columnas Json: se guarda como NULL de la base.
    // undefined se deja pasar: al actualizar no toca la columna y al crear toma su default.
    const toJson = (value: unknown) =>
      value === undefined ? undefined : ((value as Prisma.InputJsonValue | null) ?? Prisma.DbNull);
    const values = {
      ...data,
      answers: toJson(data.answers),
      templateSnapshot: toJson(data.templateSnapshot),
    };
    const record = await this.prisma.patientBackground.upsert({
      where: { patientUuid },
      create: { patientUuid, ...values, createdByUuid: actorUuid, updatedByUuid: actorUuid },
      update: { ...values, updatedByUuid: actorUuid },
    });
    return this.mapToEntity(record);
  }
}
