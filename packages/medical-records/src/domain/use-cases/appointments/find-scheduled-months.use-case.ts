import { Injectable } from '@nestjs/common';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

/**
 * Meses que pueblan el filtro de "próxima cita" del listado de pacientes.
 *
 * Son dos fuentes: los meses con cita confirmada y los meses anotados como
 * tentativos. Ambos tienen que aparecer — un mes con solo pacientes por
 * confirmar es justamente el que recepción necesita abrir para llamarlos.
 */
@Injectable()
export class FindScheduledMonthsUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
  ) {}

  async execute(tenantUUID: string): Promise<string[]> {
    const [scheduled, tentative] = await Promise.all([
      this.storage.findScheduledMonths(tenantUUID),
      this.patientStorage.findTentativeMonths(tenantUUID),
    ]);

    return Array.from(new Set([...scheduled, ...tentative])).sort();
  }
}
