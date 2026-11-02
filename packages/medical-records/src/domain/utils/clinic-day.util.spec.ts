import { describe, it, expect } from '@jest/globals';
import { clinicDayRange, toClinicMonthKey } from './clinic-day.util';

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

describe('toClinicMonthKey', () => {
  it('una cita del 31 de octubre a las 19:00 de Costa Rica cuenta en octubre', () => {
    expect(toClinicMonthKey(new Date('2026-11-01T01:00:00.000Z'))).toBe('2026-10');
  });

  it('la medianoche de Costa Rica ya es el mes siguiente', () => {
    expect(toClinicMonthKey(new Date('2026-10-31T23:59:59.999Z'))).toBe('2026-10');
    expect(toClinicMonthKey(new Date('2026-11-01T06:00:00.000Z'))).toBe('2026-11');
  });

  it('las citas "sin hora" (08:00Z) siguen en su mismo mes', () => {
    expect(toClinicMonthKey(new Date('2026-11-01T08:00:00.000Z'))).toBe('2026-11');
  });
});
