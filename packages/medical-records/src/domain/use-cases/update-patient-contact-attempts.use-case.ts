import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/**
 * Cuántas veces se llamó al paciente (0 a 3). El personal lo sube y lo
 * reinicia a mano; no depende de citas ni de mantenimientos.
 */
@Injectable()
export class UpdatePatientContactAttemptsUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    count: number,
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const previousCount = existing.contactAttempts;
    if (previousCount === count) return existing;

    const updated = await this.storage.updateContactAttempts(uuid, tenantUuid, count);

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid: uuid,
      actorUuid,
      action: PatientActivityAction.CONTACT_ATTEMPTS_CHANGED,
      detail: { count, previousCount },
    });

    return updated;
  }
}
