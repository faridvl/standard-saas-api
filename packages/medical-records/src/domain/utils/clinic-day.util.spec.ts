import { describe, it, expect } from '@jest/globals';
import { clinicDayRange, clinicMonthRange } from './clinic-day.util';

describe('clinicDayRange', () => {
  const { start, end } = clinicDayRange('2026-11-03');
  const isInDay = (iso: string) => {
    const instant = new Date(iso).getTime();
    return instant >= start.getTime() && instant < end.getTime();
  };

  it('va de las 06:00Z del día a las 06:00Z del siguiente', () => {
    expect(start.toISOString()).toBe('2026-11-03T06:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T06:00:00.000Z');
  });

  it.each([
    ['2026-11-03T14:00:00Z', true],
    ['2026-11-04T00:00:00Z', true],
    ['2026-11-04T05:59:59.999Z', true],
    ['2026-11-04T06:00:00Z', false],
    ['2026-11-03T05:59:00Z', false],
    ['2026-11-03T08:00:00Z', true],
  ])('la cita %s %s pertenece al 03', (iso, expected) => {
    expect(isInDay(iso)).toBe(expected);
  });

  it('cruza fin de mes y de año', () => {
    expect(clinicDayRange('2026-12-31').end.toISOString()).toBe('2027-01-01T06:00:00.000Z');
    expect(clinicDayRange('2026-02-28').end.toISOString()).toBe('2026-03-01T06:00:00.000Z');
  });
});

describe('clinicMonthRange', () => {
  it('va del día 1 a las 06:00Z al día 1 del mes siguiente', () => {
    const { start, end } = clinicMonthRange('2026-11');
    expect(start.toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T06:00:00.000Z');
  });

  it('diciembre pasa al enero siguiente', () => {
    expect(clinicMonthRange('2026-12').end.toISOString()).toBe('2027-01-01T06:00:00.000Z');
  });
});
