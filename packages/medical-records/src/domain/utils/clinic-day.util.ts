import { toClinicDayKey } from './lab-shipment-date.util';

/** Costa Rica no tiene horario de verano: su medianoche cae siempre a las 06:00 UTC. */
const CLINIC_MIDNIGHT_UTC = 'T06:00:00.000Z';

/** Instante (UTC) en que empieza el día de la clínica al que pertenece `instant`. */
export function startOfClinicDay(instant: Date): Date {
  return new Date(`${toClinicDayKey(instant)}${CLINIC_MIDNIGHT_UTC}`);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Suma días a un "YYYY-MM-DD" sin pasar por la zona horaria del servidor. */
function addDaysToDayKey(dayKey: string, days: number): string {
  const noon = new Date(`${dayKey}T12:00:00.000Z`);
  return new Date(noon.getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Rango UTC del día de la clínica `dayKey`: de su medianoche (incluida) a la del día siguiente (excluida). */
export function clinicDayRange(dayKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dayKey}${CLINIC_MIDNIGHT_UTC}`),
    end: new Date(`${addDaysToDayKey(dayKey, 1)}${CLINIC_MIDNIGHT_UTC}`),
  };
}

/** Mes "YYYY-MM" de un instante, en hora de Costa Rica. */
export function toClinicMonthKey(instant: Date): string {
  return toClinicDayKey(instant).slice(0, 7);
}
