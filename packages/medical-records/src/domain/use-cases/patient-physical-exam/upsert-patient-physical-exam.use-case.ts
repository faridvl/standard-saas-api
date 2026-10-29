import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientPhysicalExamStorage } from '@medical-records/infrastructure/adapters/patientPhysicalExamRepository/patient-physical-exam.storage';
import {
  PatientPhysicalExamEntity,
  PatientPhysicalExamWriteData,
} from '@medical-records/domain/entities/patient-physical-exam.entity';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientFieldChange,
} from '@medical-records/domain/types/patient-activity.types';

const EDITABLE_FIELDS = ['otoscopyRight', 'otoscopyLeft'] as const;

/** Recorta y deja "" como null; undefined (no vino) se conserva para no tocar el campo. */
function normalize(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

@Injectable()
export class UpsertPatientPhysicalExamUseCase {
  constructor(
    private readonly storage: PatientPhysicalExamStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  /** Null si no existía y lo que llegó está vacío: no se crea una fila vacía. */
  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: PatientPhysicalExamWriteData,
  ): Promise<PatientPhysicalExamEntity | null> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const existing = await this.storage.findByPatient(patientUuid);
    const data: PatientPhysicalExamWriteData = {};
    const changes: PatientFieldChange[] = [];
    EDITABLE_FIELDS.forEach((field) => {
      const after = normalize(dto[field]);
      if (after === undefined) return;
      data[field] = after;
      const before = existing?.[field] ?? null;
      if (before !== after) changes.push({ field, before, after });
    });

    if (changes.length === 0) return existing;

    const saved = await this.storage.upsert(patientUuid, actorUuid, data);

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: PatientActivityAction.PHYSICAL_EXAM_UPDATED,
      detail: { changes },
    });

    return saved;
  }
}
