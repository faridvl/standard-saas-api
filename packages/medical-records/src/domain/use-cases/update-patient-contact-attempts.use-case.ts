import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    expectedCount: number,
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    if (existing.contactAttempts !== expectedCount) {
      throw new ConflictException('El contador de intentos cambió; actualiza e intenta de nuevo');
    }
    if (count === expectedCount) return existing;

    // La condición por expectedCount hace atómica la escritura: si otra petición
    // ganó, no se actualiza ninguna fila y no se deja evento.
    const updatedRows = await this.storage.updateContactAttemptsIfCurrent(
      uuid,
      tenantUuid,
      count,
      expectedCount,
    );
    if (updatedRows === 0) {
      throw new ConflictException('El contador de intentos cambió; actualiza e intenta de nuevo');
    }

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid: uuid,
      actorUuid,
      action: PatientActivityAction.CONTACT_ATTEMPTS_CHANGED,
      detail: { count, previousCount: expectedCount },
    });

    const updated = await this.storage.findByUuid(uuid, tenantUuid);
    if (!updated) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }
    return updated;
  }
}
