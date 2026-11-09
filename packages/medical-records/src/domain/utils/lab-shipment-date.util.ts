/** Zona del negocio: "hoy" y el día de una fecha guardada se leen aquí, no en UTC. */
const CLINIC_TIME_ZONE = 'America/Costa_Rica';

/**
 * La fecha de envío se guarda a mediodía UTC: cae en el mismo día en cualquier
 * zona de América, sin el corrimiento de una medianoche UTC.
 */
const SHIPMENT_TIME_UTC = 'T12:00:00.000Z';

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día "YYYY-MM-DD" de un instante, en hora de Costa Rica. */
export function toClinicDayKey(instant: Date): string {
  return dayFormatter.format(instant);
}

/** true si "YYYY-MM-DD" es un día real del calendario (no 2026-02-30). */
export function isValidDayKey(dayKey: string): boolean {
  if (!DAY_KEY_PATTERN.test(dayKey)) return false;
  const parsed = new Date(`${dayKey}${SHIPMENT_TIME_UTC}`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(dayKey);
}

/** Valor de `hearingAidsInLabSince` para un día elegido. */
export function shipmentDayToSince(dayKey: string): Date {
  return new Date(`${dayKey}${SHIPMENT_TIME_UTC}`);
}

/** true si el día es posterior a hoy en Costa Rica. */
export function isFutureClinicDay(dayKey: string, now: Date): boolean {
  return dayKey > toClinicDayKey(now);
}
