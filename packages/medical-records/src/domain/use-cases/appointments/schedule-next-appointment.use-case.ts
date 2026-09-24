import { Injectable } from '@nestjs/common';
import { ScheduleNextAppointmentDto } from '@medical-records/app/dtos/next-appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { MedicalSpeciality } from '@medical-records/domain/types/medical-control-content.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

const APPOINTMENT_DURATION_MINUTES = 30;

/**
 * El modal de agendar rápido solo pide el día: no tiene sentido pedirle al
 * usuario una hora exacta cuando ni siquiera elige tipo de cita. startTime
 * es obligatorio en el schema (compartido con Zynka), así que se fija
 * internamente a esta hora en vez de exponerla en el formulario.
 */
const DEFAULT_APPOINTMENT_HOUR = 8;

/**
 * Tipo de cita usado cuando la petición no manda `typeUUID`. Zynka sigue
 * llamando a este endpoint sin elegir tipo, así que el genérico tiene que
 * seguir existiendo. Es configuración propia del tenant AudioColors.
 */
const GENERIC_APPOINTMENT_TYPE_UUID = 'e684a454-aa15-4f64-9bfd-4ea805b7482f';

@Injectable()
export class ScheduleNextAppointmentUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
  ) {}

  async execute(
    patientUUID: string,
    tenantUUID: string,
    userUUID: string,
    dto: ScheduleNextAppointmentDto,
  ): Promise<Appointment> {
    await this.storage.completeConfirmedFutureByPatient(patientUUID, tenantUUID);

    const startTime = new Date(`${dto.date}T00:00:00.000Z`);
    startTime.setUTCHours(DEFAULT_APPOINTMENT_HOUR, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000);

    const appointment = await this.storage.create(
      {
        patientUUID,
        userUUID,
        typeUUID: dto.typeUUID ?? GENERIC_APPOINTMENT_TYPE_UUID,
        branchUUID: dto.branchUUID,
        speciality: MedicalSpeciality.AUDIOLOGY,
        status: AppointmentStatus.CONFIRMED,
        schedule: { date: startTime, startTime, endTime },
      },
      tenantUUID,
    );

    // Con el día ya confirmado el apunte tentativo sobra: si se quedara, el
    // paciente aparecería a la vez como "pendiente de confirmar" y con cita
    // agendada. El tipo se va con el mes, porque ya viajó a la cita real. Se
    // limpia aquí y no desde el front para que valga igual desde cualquier
    // cliente que llame al endpoint.
    await this.patientStorage.update(patientUUID, tenantUUID, {
      tentativeAppointmentMonth: null,
      tentativeAppointmentTypeUuid: null,
    });

    return appointment;
  }
}
