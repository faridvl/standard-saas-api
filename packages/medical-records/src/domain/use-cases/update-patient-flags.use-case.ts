import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import {
  PatientFlagsUpdate,
  PatientStorage,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientFlagsDto } from '@medical-records/app/dtos/update-patient-flags.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/** Cada indicador: su clave en el DTO, la columna "desde cuándo" y la acción de la bitácora. */
const FLAGS: {
  key: keyof UpdatePatientFlagsDto;
  sinceField: keyof PatientFlagsUpdate;
  action: PatientActivityAction;
}[] = [
  {
    key: 'hearingAidsInLab',
    sinceField: 'hearingAidsInLabSince',
    action: PatientActivityAction.HEARING_AIDS_LAB_CHANGED,
  },
  {
    key: 'hasActiveWarranty',
    sinceField: 'warrantyActiveSince',
    action: PatientActivityAction.WARRANTY_CHANGED,
  },
  {
    key: 'isVideoCandidate',
    sinceField: 'videoCandidateSince',
    action: PatientActivityAction.VIDEO_CANDIDATE_CHANGED,
  },
];

/**
 * Indicadores del paciente que se prenden y apagan (audífonos en laboratorio,
 * garantía activa, candidato a video). Son independientes del estado
 * activo/inactivo/fallecido. Cada uno se guarda como "desde cuándo", null si
 * está apagado.
 */
@Injectable()
export class UpdatePatientFlagsUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpdatePatientFlagsDto,
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const now = new Date();
    const changes: PatientFlagsUpdate = {};
    const activities: { action: PatientActivityAction; isOn: boolean }[] = [];

    for (const flag of FLAGS) {
      const isOn = dto[flag.key];
      if (isOn === undefined || isOn === (existing[flag.sinceField] !== null)) continue;
      changes[flag.sinceField] = isOn ? now : null;
      activities.push({ action: flag.action, isOn });
    }

    if (activities.length === 0) return existing;

    const updated = await this.storage.updateFlags(uuid, tenantUuid, changes);

    for (const activity of activities) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: uuid,
        actorUuid,
        action: activity.action,
        detail: { isOn: activity.isOn },
      });
    }

    return updated;
  }
}
