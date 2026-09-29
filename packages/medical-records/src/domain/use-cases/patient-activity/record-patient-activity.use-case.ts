import { Injectable, Logger } from '@nestjs/common';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';
import { RecordPatientActivityInput } from '@medical-records/domain/types/patient-activity.types';

/**
 * Anota una acción en la bitácora de pacientes.
 *
 * Se llama después de que la acción ya se guardó, y nunca lanza: si la
 * bitácora falla se deja en el log, pero la nota, el archivo o la cita que
 * el usuario acaba de guardar no deben reportarse como fallidos por eso.
 */
@Injectable()
export class RecordPatientActivityUseCase {
  private readonly logger = new Logger(RecordPatientActivityUseCase.name);

  constructor(private readonly storage: PatientActivityStorage) {}

  async execute(input: RecordPatientActivityInput): Promise<void> {
    try {
      await this.storage.create(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo registrar ${input.action} del paciente ${input.patientUuid}: ${message}`,
      );
    }
  }
}
