import { Injectable } from '@nestjs/common';
import { EncounterStorage } from '@medical-records/infrastructure/adapters/encounterRepository/encounter.storage';
import { CreateEncounterDto } from '@medical-records/app/dtos/encounter.dto';
import { EncounterEntity } from '@medical-records/domain/entities/encounter.entity';

import { TenantReferenceChecker } from '@medical-records/infrastructure/adapters/tenant/tenant-reference.checker';

@Injectable()
export class CreateEncounterUseCase {
  constructor(
    private readonly storage: EncounterStorage,
    private readonly references: TenantReferenceChecker,
  ) {}

  async execute(
    dto: CreateEncounterDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<EncounterEntity> {
    await this.references.assertPatient(dto.patientUuid, context.tenantUuid);
    await this.references.assertAppointment(dto.appointmentUuid, context.tenantUuid);
    return this.storage.save({
      patientUuid: dto.patientUuid,
      tenantUuid: context.tenantUuid,
      autorUuid: context.userUuid,
      especialidad: dto.especialidad,
      appointmentUuid: dto.appointmentUuid,
    });
  }
}
