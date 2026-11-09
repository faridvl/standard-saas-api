import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdatePatientQuestionnaireEntryUseCase } from './update-patient-questionnaire-entry.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ENTRY = 'entry-1';
const AUTHOR = 'user-author';
const CORRECTOR = 'user-corrector';

// Costa Rica es UTC-6: 01-nov 10:00 CR.
const CREATED_AT = '2026-11-01T16:00:00.000Z';
const SAME_DAY = new Date('2026-11-02T05:59:00.000Z'); // 01-nov 23:59 CR
const NEXT_DAY = new Date('2026-11-02T06:05:00.000Z'); // 02-nov 00:05 CR

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    uuid: ENTRY,
    patientUuid: PATIENT,
    templateUuid: 'template-1',
    templateSnapshot: {
      name: 'Hábitos',
      fields: [
        { id: 'sueno', label: 'Horas de sueño', fieldType: 'number', required: true, order: 1 },
        { id: 'notas', label: 'Notas', fieldType: 'textarea', required: false, order: 2 },
      ],
    },
    answers: { sueno: 7 },
    createdAt: CREATED_AT,
    createdByUuid: AUTHOR,
    updatedAt: null,
    updatedByUuid: null,
    ...overrides,
  };
}

describe('UpdatePatientQuestionnaireEntryUseCase', () => {
  let records: ReturnType<typeof buildRecord>[];
  let updates: { entryUuid: string; tenantUuid: string; data: Record<string, unknown> }[];
  let activities: Record<string, unknown>[];
  let useCase: UpdatePatientQuestionnaireEntryUseCase;

  beforeEach(() => {
    records = [buildRecord()];
    updates = [];
    activities = [];

    const storage = {
      patientExists: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve(patientUuid === PATIENT && tenantUuid === TENANT),
      findByUuid: (entryUuid: string, patientUuid: string) =>
        Promise.resolve(
          records.find((r) => r.uuid === entryUuid && r.patientUuid === patientUuid) ?? null,
        ),
      update: (entryUuid: string, tenantUuid: string, data: Record<string, unknown>) => {
        updates.push({ entryUuid, tenantUuid, data });
        return Promise.resolve({ ...records[0], ...data });
      },
    };
    const names: Record<string, string> = { [AUTHOR]: 'Dra. Ana', [CORRECTOR]: 'Dr. Luis' };
    const getOrCreateUser = { execute: (uuid: string) => Promise.resolve(names[uuid] ?? null) };
    const recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };

    useCase = new UpdatePatientQuestionnaireEntryUseCase(
      storage as never,
      getOrCreateUser as never,
      recordActivity as never,
    );
  });

  it('corrige en el mismo día y deja anotado quién y cuándo', async () => {
    const result = await useCase.execute(
      PATIENT,
      ENTRY,
      TENANT,
      CORRECTOR,
      { answers: { sueno: 8, notas: 'Mejor' } },
      SAME_DAY,
    );

    expect(updates).toHaveLength(1);
    expect(updates[0].tenantUuid).toBe(TENANT);
    expect(updates[0].data).toMatchObject({
      answers: { sueno: 8, notas: 'Mejor' },
      updatedByUuid: CORRECTOR,
      updatedAt: SAME_DAY,
    });
    expect(result).toMatchObject({
      createdByUuid: AUTHOR,
      createdByName: 'Dra. Ana',
      updatedByName: 'Dr. Luis',
      createdAt: CREATED_AT,
      canEdit: true,
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      action: PatientActivityAction.QUESTIONNAIRE_CORRECTED,
      detail: { templateUuid: 'template-1', templateName: 'Hábitos' },
    });
    expect(JSON.stringify(activities[0])).not.toContain('answers');
  });

  it('da 409 fuera del día, con mensaje para el personal y sin ids', async () => {
    const attempt = useCase.execute(
      PATIENT,
      ENTRY,
      TENANT,
      CORRECTOR,
      { answers: { sueno: 8 } },
      NEXT_DAY,
    );
    await expect(attempt).rejects.toThrow(ConflictException);
    await expect(attempt).rejects.toThrow(
      'Este registro ya no se puede corregir: solo se corrige el mismo día en que se llenó.',
    );
    expect(updates).toHaveLength(0);
    expect(activities).toHaveLength(0);
  });

  it('da 404 si el registro es de otro paciente', async () => {
    records = [buildRecord({ patientUuid: 'otro-paciente' })];
    await expect(
      useCase.execute(PATIENT, ENTRY, TENANT, CORRECTOR, { answers: { sueno: 8 } }, SAME_DAY),
    ).rejects.toThrow(NotFoundException);
    expect(updates).toHaveLength(0);
  });

  it('da 404 si el paciente es de otra clínica', async () => {
    await expect(
      useCase.execute(
        PATIENT,
        ENTRY,
        'otra-clinica',
        CORRECTOR,
        { answers: { sueno: 8 } },
        SAME_DAY,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(updates).toHaveLength(0);
  });

  it('da 404 si el registro no existe', async () => {
    await expect(
      useCase.execute(PATIENT, 'no-existe', TENANT, CORRECTOR, { answers: { sueno: 8 } }, SAME_DAY),
    ).rejects.toThrow(NotFoundException);
  });

  it('da 400 si queda sin ninguna respuesta con contenido', async () => {
    records = [
      buildRecord({
        templateSnapshot: {
          name: 'Hábitos',
          fields: [
            { id: 'notas', label: 'Notas', fieldType: 'textarea', required: false, order: 1 },
          ],
        },
      }),
    ];
    await expect(
      useCase.execute(PATIENT, ENTRY, TENANT, CORRECTOR, { answers: { notas: '  ' } }, SAME_DAY),
    ).rejects.toThrow(BadRequestException);
    expect(updates).toHaveLength(0);
  });

  it('da 400 si falta una obligatoria', async () => {
    await expect(
      useCase.execute(PATIENT, ENTRY, TENANT, CORRECTOR, { answers: { notas: 'x' } }, SAME_DAY),
    ).rejects.toThrow(BadRequestException);
  });

  it('da 400 si una respuesta tiene un tipo incorrecto', async () => {
    await expect(
      useCase.execute(PATIENT, ENTRY, TENANT, CORRECTOR, { answers: { sueno: 'mucho' } }, SAME_DAY),
    ).rejects.toThrow(BadRequestException);
    expect(updates).toHaveLength(0);
  });

  it('valida contra las preguntas del propio registro, no contra la plantilla actual', async () => {
    await expect(
      useCase.execute(
        PATIENT,
        ENTRY,
        TENANT,
        CORRECTOR,
        { answers: { sueno: 8, pregunta_nueva: 'x' } },
        SAME_DAY,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(updates).toHaveLength(0);
  });
});
