import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientDto } from '@medical-records/app/dtos/update-patient.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientFieldChange,
} from '@medical-records/domain/types/patient-activity.types';

/**
 * Campos cuyo cambio queda en la bitácora. El mes/tipo tentativo no está:
 * esos tienen su propia acción (APPOINTMENT_TENTATIVE) desde su endpoint.
 */
const TRACKED_FIELDS = [
  'firstName',
  'lastName',
  'documentId',
  'phone',
  'email',
  'address',
  'gender',
  'bloodType',
  'occupation',
  'branchUuid',
] as const;

function normalize(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

@Injectable()
export class UpdatePatientUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    dto: UpdatePatientDto,
    actorUuid?: string,
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    if (dto.documentId && dto.documentId !== existing.documentId) {
      const duplicate = await this.storage.findByDocumentId(dto.documentId, tenantUuid, uuid);
      if (duplicate) {
        throw new ConflictException(
          `La cédula ${dto.documentId} ya está registrada para otro paciente (${duplicate.firstName} ${duplicate.lastName})`,
        );
      }
    }

    const updated = await this.storage.update(uuid, tenantUuid, dto);

    // El formulario manda todos los campos aunque no se toquen: solo se
    // anotan los que de verdad cambiaron, y si ninguno cambió no se anota nada.
    const changes: PatientFieldChange[] = TRACKED_FIELDS.filter((field) => dto[field] !== undefined)
      .map((field) => ({
        field,
        before: normalize(existing[field]),
        after: normalize(updated[field]),
      }))
      .filter((change) => change.before !== change.after);

    if (actorUuid && changes.length > 0) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: uuid,
        actorUuid,
        action: PatientActivityAction.PATIENT_UPDATED,
        detail: { changes },
      });
    }

    return updated;
  }
}
