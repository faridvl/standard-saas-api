import { describe, it, expect } from '@jest/globals';
import { buildAudiometryNoteData, buildAudiometryNoteText } from './audiometry-note-text.util';

describe('buildAudiometryNoteText', () => {
  it('escribe el tipo y la fecha como dd/MM/yyyy', () => {
    expect(buildAudiometryNoteText(new Date('2026-11-08T15:00:00.000Z'), 'CLINICAL')).toBe(
      'Se realizó audiometría clínica el 08/11/2026',
    );
  });

  it('usa el día de Costa Rica, no el de UTC', () => {
    // 03:00 UTC del 9 son las 21:00 del 8 en Costa Rica.
    expect(buildAudiometryNoteText(new Date('2026-11-09T03:00:00.000Z'), 'CLINICAL')).toBe(
      'Se realizó audiometría clínica el 08/11/2026',
    );
    // 06:00 UTC es la medianoche de Costa Rica: ya es el día 9.
    expect(buildAudiometryNoteText(new Date('2026-11-09T06:00:00.000Z'), 'CLINICAL')).toBe(
      'Se realizó audiometría clínica el 09/11/2026',
    );
  });

  it('nombra la audiometría de rastreo', () => {
    expect(buildAudiometryNoteText(new Date('2026-11-08T15:00:00.000Z'), 'SCREENING')).toBe(
      'Se realizó audiometría de rastreo el 08/11/2026',
    );
  });
});

describe('buildAudiometryNoteData', () => {
  it('arma una nota de Pruebas con el autor y la misma fecha de la audiometría', () => {
    const createdAt = new Date('2026-11-08T15:00:00.000Z');
    const note = buildAudiometryNoteData(
      { tenantUuid: 't1', patientUuid: 'p1', createdByUuid: 'u1', typeCode: 'CLINICAL' } as never,
      createdAt,
      'a1',
    );
    expect(note).toEqual({
      patientUuid: 'p1',
      tenantUuid: 't1',
      authorUuid: 'u1',
      category: 'EXTERNAL_TEST',
      text: 'Se realizó audiometría clínica el 08/11/2026',
      audiometryEntryUuid: 'a1',
      createdAt,
    });
  });
});
