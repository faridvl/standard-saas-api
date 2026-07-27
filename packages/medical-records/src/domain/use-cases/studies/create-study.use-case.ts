import { Injectable } from '@nestjs/common';
import { StudyStorage } from '@medical-records/infrastructure/adapters/studyRepository/study.storage';
import { CreateStudyDto } from '@medical-records/app/dtos/study.dto';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';

@Injectable()
export class CreateStudyUseCase {
  constructor(private readonly storage: StudyStorage) {}

  async execute(
    dto: CreateStudyDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<StudyEntity> {
    return this.storage.save({
      encounterUuid: dto.encounterUuid,
      patientUuid: dto.patientUuid,
      tenantUuid: context.tenantUuid,
      autorUuid: context.userUuid,
      tipo: dto.tipo,
      payload: dto.payload,
      documentUuid: dto.documentUuid,
    });
  }
}
