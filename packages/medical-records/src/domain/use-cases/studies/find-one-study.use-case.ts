import { Injectable } from '@nestjs/common';
import { StudyStorage } from '@medical-records/infrastructure/adapters/studyRepository/study.storage';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';

@Injectable()
export class FindOneStudyUseCase {
  constructor(private readonly storage: StudyStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<StudyEntity> {
    return this.storage.findOneByUuid(uuid, tenantUuid);
  }
}
