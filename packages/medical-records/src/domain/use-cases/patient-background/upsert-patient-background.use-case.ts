import { Injectable } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { UpsertPatientBackgroundDto } from '@medical-records/app/dtos/patient-background.dto';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

@Injectable()
export class UpsertPatientBackgroundUseCase {
  constructor(private readonly storage: PatientBackgroundStorage) {}

  async execute(patientUuid: string, dto: UpsertPatientBackgroundDto): Promise<PatientBackgroundEntity> {
    return this.storage.upsert(patientUuid, { ...dto, notes: dto.notes ?? null });
  }
}
