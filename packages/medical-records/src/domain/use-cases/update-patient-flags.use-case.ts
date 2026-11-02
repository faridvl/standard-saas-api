import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import {
  PatientFlagsUpdate,
  PatientStorage,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientFlagsDto } from '@medical-records/app/dtos/update-patient-flags.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientActivityDetail,
} from '@medical-records/domain/types/patient-activity.types';
import {
  isFutureClinicDay,
  shipmentDayToSince,
  toClinicDayKey,
} from '@medical-records/domain/utils/lab-shipment-date.util';

type FlagKey =
  | 'hearingAidsInLab'
  | 'hasActiveWarranty'
  | 'isVideoCandidate'
  | 'warrantyExpired'
  | 'renewPrescription';

/** Cada indicador: su clave en el DTO, la columna "desde cuándo" y la acción de la bitácora. */
const FLAGS: {
  key: FlagKey;
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
  {
    key: 'warrantyExpired',
    sinceField: 'warrantyExpiredSince',
    action: PatientActivityAction.WARRANTY_EXPIRED_CHANGED,
  },
  {
    key: 'renewPrescription',
    sinceField: 'renewPrescriptionSince',
    action: PatientActivityAction.RENEW_PRESCRIPTION_CHANGED,
  },
];

/**
 * Indicadores del paciente que se prenden y apagan (audífonos en laboratorio,
 * garantía activa, candidato a video, garantía vencida, renovar receta). Son independientes del estado
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
  ): Promise<PatientRecord> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const now = new Date();
    const shipmentDay = dto.hearingAidsInLabDate;
    if (shipmentDay && isFutureClinicDay(shipmentDay, now)) {
      throw new BadRequestException('La fecha de envío no puede ser posterior a hoy');
    }

    const changes: PatientFlagsUpdate = {};
    const activities: { action: PatientActivityAction; detail: PatientActivityDetail }[] = [];

    for (const flag of FLAGS) {
      const isOn = dto[flag.key];
      if (isOn === undefined) continue;
      const currentSince = existing[flag.sinceField];
      const wasOn = currentSince !== null;

      if (flag.key === 'hearingAidsInLab' && isOn && shipmentDay) {
        const previousDay = currentSince ? toClinicDayKey(currentSince) : null;
        if (wasOn && previousDay === shipmentDay) continue;
        changes[flag.sinceField] = shipmentDayToSince(shipmentDay);
        activities.push({
          action: flag.action,
          detail: {
            isOn: true,
            date: shipmentDay,
            ...(previousDay && { previousDate: previousDay }),
          },
        });
        continue;
      }

      if (isOn === wasOn) continue;
      changes[flag.sinceField] = isOn ? now : null;
      activities.push({
        action: flag.action,
        detail:
          flag.key === 'hearingAidsInLab' && isOn ? { isOn, date: toClinicDayKey(now) } : { isOn },
      });
    }

    if (activities.length === 0) return existing;

    const updated = await this.storage.updateFlags(uuid, tenantUuid, changes);

    for (const activity of activities) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: uuid,
        actorUuid,
        action: activity.action,
        detail: activity.detail,
      });
    }

    return updated;
  }
}
