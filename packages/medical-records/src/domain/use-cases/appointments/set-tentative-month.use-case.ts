import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

/**
 * Fija (o limpia) el mes tentativo de la próxima cita de un paciente.
 *
 * Flujo de la clínica: al cerrar una visita se anota solo el mes en que
 * tocaría volver. Más adelante recepción llama; si el paciente confirma se
 * agenda el día real (ScheduleNextAppointmentUseCase, que limpia el mes), y
 * si no confirma se corre el mes tentativo sin fijar día.
 *
 * Por eso anotar un mes tentativo cancela cualquier cita CONFIRMED futura:
 * volver a "solo mes" significa que la fecha que había dejó de valer, y si
 * se quedara el paciente saldría a la vez con cita agendada y pendiente de
 * confirmar.
 */
@Injectable()
export class SetTentativeMonthUseCase {
  constructor(
    private readonly patientStorage: PatientStorage,
    private readonly appointmentStorage: AppointmentStorage,
  ) {}

  async execute(patientUuid: string, tenantUuid: string, month: string | null): Promise<void> {
    const patient = await this.patientStorage.findByUuid(patientUuid, tenantUuid);
    if (!patient) {
      throw new NotFoundException(`Paciente con UUID ${patientUuid} no encontrado`);
    }

    if (month) {
      await this.appointmentStorage.cancelConfirmedFutureByPatient(patientUuid, tenantUuid);
    }

    await this.patientStorage.update(patientUuid, tenantUuid, {
      tentativeAppointmentMonth: month,
    });
  }
}
