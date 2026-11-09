import { toClinicDayKey } from './lab-shipment-date.util';

/** Un registro se corrige solo el mismo día (calendario de Costa Rica) en que se creó. */
export function canEditQuestionnaireEntry(createdAt: Date | string, now: Date): boolean {
  return toClinicDayKey(new Date(createdAt)) === toClinicDayKey(now);
}
