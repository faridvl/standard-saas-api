import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientStatusDto } from '@medical-records/app/dtos/update-patient-status.dto';
import { PatientStatus } from '@medical-records/domain/types/patient-status.types';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/** "2026-09-15" -> Date al mediodía UTC, para que ninguna zona horaria lo corra de día. */
function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

@Injectable()
export class UpdatePatientStatusUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpdatePatientStatusDto,
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const isActive = dto.status === PatientStatus.ACTIVE;
    const isDeceased = dto.status === PatientStatus.DECEASED;
    const reason = isActive ? null : dto.reason?.trim() || null;
    const date = isDeceased && dto.date ? dto.date : null;

    const updated = await this.storage.updateStatus(
      uuid,
      tenantUuid,
      { status: dto.status, statusReason: reason, statusDate: date ? parseDay(date) : null },
      isDeceased,
    );

    const previousDate = existing.statusDate?.toISOString().slice(0, 10) ?? null;
    const changed =
      (existing.status as PatientStatus) !== dto.status ||
      (existing.statusReason ?? null) !== reason ||
      previousDate !== date;

    if (changed) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: uuid,
        actorUuid,
        action: PatientActivityAction.STATUS_CHANGED,
        detail: { before: existing.status, after: dto.status, reason, date },
      });
    }

    return updated;
  }
}
