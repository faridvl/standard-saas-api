import { toClinicDayKey } from './lab-shipment-date.util';

/** Costa Rica no tiene horario de verano: su medianoche cae siempre a las 06:00 UTC. */
const CLINIC_MIDNIGHT_UTC = 'T06:00:00.000Z';

/** Instante (UTC) en que empieza el día de la clínica al que pertenece `instant`. */
export function startOfClinicDay(instant: Date): Date {
  return new Date(`${toClinicDayKey(instant)}${CLINIC_MIDNIGHT_UTC}`);
}
