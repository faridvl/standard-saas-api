import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import {
  assertBranchesExist,
  resolvePatientBranches,
} from '@medical-records/domain/services/patient-branches';
import { stripPatientClinicalWrites } from '@medical-records/domain/policies/patient-clinical-fields.policy';
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
  'birthDate',
  'email',
  'address',
  'gender',
  'bloodType',
  'occupation',
] as const;

function normalize(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/** Sedes como texto estable para compararlas: sin importar el orden de las secundarias. */
function joinBranches(uuids: string[]): string | null {
  return uuids.length > 0 ? [...uuids].sort().join(',') : null;
}

@Injectable()
export class UpdatePatientUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly branchStorage: BranchStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    input: UpdatePatientDto,
    actorUuid: string | undefined,
    attendsPatients: boolean,
  ): Promise<PatientRecord> {
    const dto = stripPatientClinicalWrites(input, attendsPatients);
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

    if (dto.warrantyDocumentUuid) {
      const belongs = await this.storage.documentBelongsToPatient(
        dto.warrantyDocumentUuid,
        uuid,
        tenantUuid,
      );
      if (!belongs) {
        throw new BadRequestException('El documento de garantía no existe en el expediente');
      }
    }

    const branches = resolvePatientBranches(dto, {
      branchUuid: existing.branchUuid,
      branchUuids: existing.branchUuids,
    });
    if (branches) {
      assertBranchesExist(
        branches.branchUuids,
        await this.branchStorage.findUuidsInTenant(tenantUuid, branches.branchUuids),
      );
    }

    const updated = await this.storage.update(uuid, tenantUuid, dto, branches);

    // El formulario manda todos los campos aunque no se toquen: solo se
    // anotan los que de verdad cambiaron, y si ninguno cambió no se anota nada.
    const changes: PatientFieldChange[] = TRACKED_FIELDS.filter((field) => dto[field] !== undefined)
      .map((field) => ({
        field,
        before: normalize(existing[field]),
        after: normalize(updated[field]),
      }))
      .filter((change) => change.before !== change.after);

    if (branches) {
      const branchChanges: PatientFieldChange[] = [
        {
          field: 'branchUuid',
          before: normalize(existing.branchUuid),
          after: normalize(updated.branchUuid),
        },
        {
          field: 'branchUuids',
          before: joinBranches(existing.branchUuids),
          after: joinBranches(updated.branchUuids),
        },
      ];
      changes.push(...branchChanges.filter((change) => change.before !== change.after));
    }

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
