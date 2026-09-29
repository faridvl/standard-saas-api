import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import {
  PatientContactStorage,
  SyncPatientContactItem,
} from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  RecordPatientActivityInput,
} from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class SyncPatientContactsUseCase {
  constructor(
    private readonly storage: PatientContactStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    items: SyncPatientContactItem[],
    actorUuid?: string,
  ): Promise<PatientContact[]> {
    const before = await this.storage.findAllByPatient(patientUuid, tenantUuid);
    const after = await this.storage.sync(patientUuid, tenantUuid, items);

    if (actorUuid) {
      // El formulario reenvía la lista completa en cada guardado: se compara
      // antes/después y solo se anota lo que se agregó, cambió o quitó.
      const beforeByUuid = new Map(before.map((contact) => [contact.uuid, contact]));
      const afterUuids = new Set(after.map((contact) => contact.uuid));
      const base = { tenantUuid, patientUuid, actorUuid };
      const activities: RecordPatientActivityInput[] = [];

      for (const contact of after) {
        const previous = beforeByUuid.get(contact.uuid);
        if (!previous) {
          activities.push({
            ...base,
            action: PatientActivityAction.CONTACT_ADDED,
            detail: { name: contact.name, phone: contact.phone },
          });
        } else if (previous.name !== contact.name || previous.phone !== contact.phone) {
          activities.push({
            ...base,
            action: PatientActivityAction.CONTACT_UPDATED,
            detail: {
              name: contact.name,
              phone: contact.phone,
              before: { name: previous.name, phone: previous.phone },
            },
          });
        }
      }

      for (const contact of before.filter((previous) => !afterUuids.has(previous.uuid))) {
        activities.push({
          ...base,
          action: PatientActivityAction.CONTACT_REMOVED,
          detail: { name: contact.name, phone: contact.phone },
        });
      }

      for (const activity of activities) {
        await this.recordActivity.execute(activity);
      }
    }

    return after;
  }
}
