import { Injectable } from '@nestjs/common';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class DeletePatientContactUseCase {
  constructor(
    private readonly storage: PatientContactStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(uuid: string, tenantUuid: string, actorUuid?: string): Promise<void> {
    const contact = await this.storage.delete(uuid, tenantUuid);

    if (actorUuid) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: contact.patientUuid,
        actorUuid,
        action: PatientActivityAction.CONTACT_REMOVED,
        detail: { name: contact.name, phone: contact.phone },
      });
    }
  }
}
