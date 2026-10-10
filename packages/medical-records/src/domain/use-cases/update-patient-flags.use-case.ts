import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientFlagsDto } from '@medical-records/app/dtos/update-patient-flags.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/**
 * Indicadores del paciente que se prenden y apagan (audífonos en laboratorio,
 * garantía activa). Son independientes del estado activo/inactivo/fallecido.
 * Cada uno se guarda como "desde cuándo", null si está apagado.
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
    const changes: {
      hearingAidsInLabSince?: Date | null;
      warrantyActiveSince?: Date | null;
    } = {};
    const activities: { action: PatientActivityAction; isOn: boolean }[] = [];

    if (
      dto.hearingAidsInLab !== undefined &&
      dto.hearingAidsInLab !== (existing.hearingAidsInLabSince !== null)
    ) {
      changes.hearingAidsInLabSince = dto.hearingAidsInLab ? now : null;
      activities.push({
        action: PatientActivityAction.HEARING_AIDS_LAB_CHANGED,
        isOn: dto.hearingAidsInLab,
      });
    }

    if (
      dto.hasActiveWarranty !== undefined &&
      dto.hasActiveWarranty !== (existing.warrantyActiveSince !== null)
    ) {
      changes.warrantyActiveSince = dto.hasActiveWarranty ? now : null;
      activities.push({
        action: PatientActivityAction.WARRANTY_CHANGED,
        isOn: dto.hasActiveWarranty,
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
        detail: { isOn: activity.isOn },
      });
    }

    return updated;
  }
}
