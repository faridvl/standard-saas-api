import { Module } from '@nestjs/common';
import { StudyController } from '../controllers/study.controller';
import { StudyStorage } from '@medical-records/infrastructure/adapters/studyRepository/study.storage';
import {
  CreateStudyUseCase,
  FindByPatientStudyUseCase,
  FindOneStudyUseCase,
} from '@medical-records/domain/use-cases/studies';

const CONTROLLERS = [StudyController];
const USE_CASES = [CreateStudyUseCase, FindByPatientStudyUseCase, FindOneStudyUseCase];
const STORAGES = [StudyStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class StudiesModule {}
