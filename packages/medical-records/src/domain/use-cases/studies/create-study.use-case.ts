import { Injectable } from '@nestjs/common';
import { StudyStorage } from '@medical-records/infrastructure/adapters/studyRepository/study.storage';
import { CreateStudyDto } from '@medical-records/app/dtos/study.dto';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';

import { TenantReferenceChecker } from '@medical-records/infrastructure/adapters/tenant/tenant-reference.checker';

@Injectable()
export class CreateStudyUseCase {
  constructor(
    private readonly storage: StudyStorage,
    private readonly references: TenantReferenceChecker,
  ) {}

  async execute(
    dto: CreateStudyDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<StudyEntity> {
    await this.references.assertPatient(dto.patientUuid, context.tenantUuid);
    await this.references.assertEncounter(dto.encounterUuid, context.tenantUuid);
    await this.references.assertDocument(dto.documentUuid, context.tenantUuid);
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
