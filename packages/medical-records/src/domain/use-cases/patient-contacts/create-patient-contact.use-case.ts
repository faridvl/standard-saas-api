import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import {
  PatientContactStorage,
  CreatePatientContactData,
} from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class CreatePatientContactUseCase {
  constructor(
    private readonly storage: PatientContactStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(data: CreatePatientContactData, actorUuid?: string): Promise<PatientContact> {
    const contact = await this.storage.create(data);

    if (actorUuid) {
      await this.recordActivity.execute({
        tenantUuid: data.tenantUuid,
        patientUuid: data.patientUuid,
        actorUuid,
        action: PatientActivityAction.CONTACT_ADDED,
        detail: { name: contact.name, phone: contact.phone },
      });
    }

    return contact;
  }
}
