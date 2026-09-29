import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

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
    private readonly appointmentTypeStorage: AppointmentTypeStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    month: string | null,
    typeUuid?: string | null,
    actorUuid?: string,
  ): Promise<void> {
    const patient = await this.patientStorage.findByUuid(patientUuid, tenantUuid);
    if (!patient) {
      throw new NotFoundException(`Paciente con UUID ${patientUuid} no encontrado`);
    }

    if (month) {
      await this.appointmentStorage.cancelConfirmedFutureByPatient(patientUuid, tenantUuid);
    }

    await this.patientStorage.update(patientUuid, tenantUuid, {
      tentativeAppointmentMonth: month,
      // Sin mes no queda nada que tipificar, así que el tipo se limpia con él.
      tentativeAppointmentTypeUuid: month ? (typeUuid ?? null) : null,
    });

    // Limpiar el mes (month null) no es una acción de la bitácora: solo se
    // anota cuando queda un mes tentativo. El nombre del tipo se guarda como
    // copia porque la clínica puede renombrar o borrar tipos después.
    if (actorUuid && month) {
      const type = typeUuid
        ? await this.appointmentTypeStorage.findByUuid(tenantUuid, typeUuid)
        : null;
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid,
        actorUuid,
        action: PatientActivityAction.APPOINTMENT_TENTATIVE,
        detail: { month, typeUuid: typeUuid ?? null, typeName: type?.name ?? null },
      });
    }
  }
}
