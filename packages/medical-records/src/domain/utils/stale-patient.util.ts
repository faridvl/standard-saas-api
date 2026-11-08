import { toClinicDayKey } from './lab-shipment-date.util';
import { clinicDayRange } from './clinic-day.util';

/** Meses sin movimiento a partir de los cuales un paciente se considera "sin actualizarse". */
export const STALE_PATIENT_MONTHS = 6;

/** Último día del mes `month` (1-12) del año `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Instante (excluido) antes del cual un último movimiento ya cumple los meses sin movimiento:
 * el final del día de Costa Rica que cae `STALE_PATIENT_MONTHS` meses antes de hoy
 * (si ese mes es más corto, el último de sus días).
 */
export function staleCutoff(now: Date): Date {
  const [year, month, day] = toClinicDayKey(now).split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) - STALE_PATIENT_MONTHS;
  const cutoffYear = Math.floor(totalMonths / 12);
  const cutoffMonth = (totalMonths % 12) + 1;
  const cutoffDay = Math.min(day, daysInMonth(cutoffYear, cutoffMonth));
  const dayKey = [
    String(cutoffYear),
    String(cutoffMonth).padStart(2, '0'),
    String(cutoffDay).padStart(2, '0'),
  ].join('-');
  return clinicDayRange(dayKey).end;
}
