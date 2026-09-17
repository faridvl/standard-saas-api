import { Injectable } from '@nestjs/common';
import { ScheduleNextAppointmentDto } from '@medical-records/app/dtos/next-appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { MedicalSpeciality } from '@medical-records/domain/types/medical-control-content.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';

const APPOINTMENT_DURATION_MINUTES = 30;

/**
 * Tipo de cita genérico usado por el modal "agendar próxima cita" del
 * detalle del paciente, donde el usuario no elige tipo/especialidad. Es
 * configuración propia de este tenant (AudioColors); habrá que revisar
 * esto cuando se prepare la migración a producción o a otro tenant.
 */
const GENERIC_APPOINTMENT_TYPE_UUID = 'e684a454-aa15-4f64-9bfd-4ea805b7482f';

@Injectable()
export class ScheduleNextAppointmentUseCase {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(
    patientUUID: string,
    tenantUUID: string,
    userUUID: string,
    dto: ScheduleNextAppointmentDto,
  ): Promise<Appointment> {
    await this.storage.completeConfirmedFutureByPatient(patientUUID, tenantUUID);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000);

    return await this.storage.create(
      {
        patientUUID,
        userUUID,
        typeUUID: GENERIC_APPOINTMENT_TYPE_UUID,
        branchUUID: dto.branchUUID,
        speciality: MedicalSpeciality.AUDIOLOGY,
        status: AppointmentStatus.CONFIRMED,
        schedule: { date: startTime, startTime, endTime },
      },
      tenantUUID,
    );
  }
}
