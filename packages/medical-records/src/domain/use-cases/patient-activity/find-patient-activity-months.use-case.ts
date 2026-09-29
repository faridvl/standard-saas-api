import { BadRequestException, Injectable } from '@nestjs/common';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';

const DEFAULT_TIME_ZONE = 'UTC';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Meses con acciones en la bitácora: opciones del filtro "Mes", para no
 * ofrecer meses vacíos. La zona horaria la manda el cliente (IANA, p. ej.
 * "America/Costa_Rica") porque el corte de mes depende de la clínica.
 */
@Injectable()
export class FindPatientActivityMonthsUseCase {
  constructor(private readonly storage: PatientActivityStorage) {}

  async execute(tenantUuid: string, timeZone?: string): Promise<string[]> {
    const zone = timeZone?.trim() || DEFAULT_TIME_ZONE;
    if (!isValidTimeZone(zone)) {
      throw new BadRequestException(`timeZone inválida: ${zone}`);
    }
    return await this.storage.findActiveMonths(tenantUuid, zone);
  }
}
