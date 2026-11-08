import { describe, it, expect } from '@jest/globals';
import { staleCutoff } from './stale-patient.util';

describe('staleCutoff (pacientes sin movimiento: 6 meses o más)', () => {
  // Hoy = 2026-11-07 en Costa Rica.
  const TODAY = new Date('2026-11-07T18:00:00.000Z');
  const isStale = (lastMovement: string) => new Date(lastMovement) < staleCutoff(TODAY);

  it('un movimiento del 2026-05-07 ya cumple los 6 meses', () => {
    expect(isStale('2026-05-07T15:00:00.000Z')).toBe(true);
  });

  it('un movimiento del 2026-05-08 todavía no', () => {
    expect(isStale('2026-05-08T15:00:00.000Z')).toBe(false);
  });

  it('el último instante del 2026-05-07 en Costa Rica cuenta; el primero del 08 no', () => {
    expect(isStale('2026-05-08T05:59:59.999Z')).toBe(true);
    expect(isStale('2026-05-08T06:00:00.000Z')).toBe(false);
  });

  it('usa el día de Costa Rica de hoy: 2026-11-08 02:00Z todavía es el 7', () => {
    const lateNight = new Date('2026-11-08T02:00:00.000Z');
    expect(staleCutoff(lateNight).toISOString()).toBe('2026-05-08T06:00:00.000Z');
  });

  it('el 31 de agosto retrocede al 28 de febrero (recorte a fin de mes)', () => {
    const cutoff = staleCutoff(new Date('2026-08-31T18:00:00.000Z'));
    expect(cutoff.toISOString()).toBe('2026-03-01T06:00:00.000Z');
  });
});
