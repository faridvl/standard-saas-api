import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

@Injectable()
export class PatientBackgroundStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: {
    uuid: string;
    patientUuid: string;
    earInfections: boolean;
    nasalSurgery: boolean;
    throatSurgery: boolean;
    earSurgery: boolean;
    diabetes: boolean;
    cholesterol: boolean;
    highPressure: boolean;
    allergies: boolean;
    rhinitis: boolean;
    vertigo: boolean;
    tinnitus: boolean;
    headacheNoise: boolean;
    cloggedEar: boolean;
    notes: string | null;
    updatedAt: Date;
  }): PatientBackgroundEntity {
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
      notes: record.notes,
      updatedAt: record.updatedAt.toISOString(),
    };
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
    data: Omit<PatientBackgroundEntity, 'uuid' | 'patientUuid' | 'updatedAt'>,
  ): Promise<PatientBackgroundEntity> {
    const record = await this.prisma.patientBackground.upsert({
      where: { patientUuid },
      create: { patientUuid, ...data },
      update: { ...data },
    });
    return this.mapToEntity(record);
  }
}
