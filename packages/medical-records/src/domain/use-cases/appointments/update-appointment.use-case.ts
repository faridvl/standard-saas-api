import { UpdateAppointmentDto } from '@medical-records/app/dtos/appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { Injectable } from '@nestjs/common';

/**
 * Cambios de estado que quedan en la bitácora: los que marca recepción desde
 * la agenda del día. Volver una cita a CONFIRMED (deshacer "llegó") no se
 * anota, igual que limpiar el mes tentativo.
 */
const STATUS_ACTIVITY: Partial<Record<AppointmentStatus, PatientActivityAction>> = {
  [AppointmentStatus.WAITING]: PatientActivityAction.APPOINTMENT_ARRIVED,
  [AppointmentStatus.COMPLETED]: PatientActivityAction.APPOINTMENT_COMPLETED,
};

@Injectable()
export class UpdateAppointmentUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUUID: string,
    dto: UpdateAppointmentDto,
    actorUuid?: string,
  ): Promise<Appointment> {
    const previous = await this.storage.findOne(uuid, tenantUUID);

    const updateData: Partial<Appointment> = {
      status: dto.status,
      notes: dto.notes,
      ...(dto.branchUUID !== undefined && { branchUUID: dto.branchUUID }),
      ...(dto.startTime &&
        dto.endTime && {
          schedule: {
            date: new Date(dto.date || new Date()),
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
          },
        }),
    };

    const updated = await this.storage.update(uuid, tenantUUID, updateData);

    const action = dto.status ? STATUS_ACTIVITY[dto.status] : undefined;
    if (actorUuid && action && dto.status !== previous.status) {
      await this.recordActivity.execute({
        tenantUuid: tenantUUID,
        patientUuid: updated.patientUUID,
        actorUuid,
        action,
        detail: {
          appointmentUuid: updated.id,
          // Mismo criterio que APPOINTMENT_CONFIRMED: el día de la cita en UTC.
          date: updated.schedule.startTime.toISOString().slice(0, 10),
          typeUuid: updated.typeUUID ?? null,
          typeName: updated.typeName ?? null,
        },
      });
    }

    return updated;
  }
}
