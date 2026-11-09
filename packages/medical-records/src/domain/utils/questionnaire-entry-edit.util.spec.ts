import { describe, it, expect } from '@jest/globals';
import { canEditQuestionnaireEntry } from './questionnaire-entry-edit.util';

// Costa Rica es UTC-6 todo el año.
describe('canEditQuestionnaireEntry', () => {
  it('permite corregir creado 23:50 CR y ahora 23:59 CR del mismo día', () => {
    const createdAt = new Date('2026-11-02T05:50:00.000Z'); // 01-nov 23:50 CR
    const now = new Date('2026-11-02T05:59:00.000Z'); // 01-nov 23:59 CR
    expect(canEditQuestionnaireEntry(createdAt, now)).toBe(true);
  });

  it('no permite corregir creado 23:50 CR y ahora 00:05 CR del día siguiente', () => {
    const createdAt = new Date('2026-11-02T05:50:00.000Z'); // 01-nov 23:50 CR
    const now = new Date('2026-11-02T06:05:00.000Z'); // 02-nov 00:05 CR
    expect(canEditQuestionnaireEntry(createdAt, now)).toBe(false);
  });

  it('permite corregir creado 00:10 CR (06:10 UTC) y ahora 17:59 CR', () => {
    const createdAt = new Date('2026-11-02T06:10:00.000Z'); // 02-nov 00:10 CR
    const now = new Date('2026-11-02T23:59:00.000Z'); // 02-nov 17:59 CR
    expect(canEditQuestionnaireEntry(createdAt, now)).toBe(true);
  });

  it('acepta createdAt como texto ISO', () => {
    expect(
      canEditQuestionnaireEntry('2026-11-02T06:10:00.000Z', new Date('2026-11-03T05:59:00.000Z')),
    ).toBe(true);
  });
});
