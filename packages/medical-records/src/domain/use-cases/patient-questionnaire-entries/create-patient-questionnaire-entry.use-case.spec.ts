import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePatientQuestionnaireEntryUseCase } from './create-patient-questionnaire-entry.use-case';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';

function buildTemplate(overrides: Partial<ClinicalTemplateEntity> = {}): ClinicalTemplateEntity {
  return {
    uuid: 'template-1',
    tenantUuid: TENANT,
    name: 'Hábitos',
    speciality: 'QUESTIONNAIRE',
    fields: [
      { id: 'sueno', label: 'Horas de sueño', fieldType: 'number', required: true, order: 1 },
      { id: 'notas', label: 'Notas', fieldType: 'textarea', required: false, order: 2 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CreatePatientQuestionnaireEntryUseCase', () => {
  let created: Record<string, unknown>[];
  let activities: Record<string, unknown>[];
  let patientActive: boolean;
  let templates: ClinicalTemplateEntity[];
  let useCase: CreatePatientQuestionnaireEntryUseCase;

  beforeEach(() => {
    created = [];
    activities = [];
    patientActive = true;
    templates = [buildTemplate()];

    const storage = {
      patientExists: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve(patientActive && patientUuid === PATIENT && tenantUuid === TENANT),
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve({ uuid: 'entry-1', createdAt: '2026-11-01T10:00:00.000Z', ...data });
      },
    };
    const templateStorage = {
      findByUuid: (uuid: string, tenantUuid: string) =>
        Promise.resolve(
          templates.find((t) => t.uuid === uuid && t.tenantUuid === tenantUuid) ?? null,
        ),
    };
    const getOrCreateUser = { execute: () => Promise.resolve('Dra. Ana') };
    const recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };

    useCase = new CreatePatientQuestionnaireEntryUseCase(
      storage as never,
      templateStorage as never,
      getOrCreateUser as never,
      recordActivity as never,
    );
  });

  it('guarda el registro con copia de las preguntas y deja el evento sin respuestas', async () => {
    const result = await useCase.execute(PATIENT, TENANT, ACTOR, {
      templateUuid: 'template-1',
      answers: { sueno: 7 },
    });

    expect(result.createdByName).toBe('Dra. Ana');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      patientUuid: PATIENT,
      templateUuid: 'template-1',
      createdByUuid: ACTOR,
      answers: { sueno: 7 },
      templateSnapshot: { name: 'Hábitos' },
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      action: PatientActivityAction.QUESTIONNAIRE_FILLED,
      detail: { templateUuid: 'template-1', templateName: 'Hábitos' },
    });
    expect(JSON.stringify(activities[0])).not.toContain('answers');
  });

  it('rechaza si faltan obligatorias', async () => {
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { notas: 'x' },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('rechaza una obligatoria en blanco', async () => {
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: '  ' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza ids de respuesta desconocidos', async () => {
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: 7, inventado: 'x' },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('da 404 si la plantilla es de otra clínica', async () => {
    templates = [buildTemplate({ tenantUuid: 'otra-clinica' })];
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: 7 },
      }),
    ).rejects.toThrow(NotFoundException);
    expect(created).toHaveLength(0);
  });

  it('rechaza una plantilla que no es QUESTIONNAIRE', async () => {
    templates = [buildTemplate({ speciality: 'CLINICAL_HISTORY' })];
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: 7 },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('da 404 si el paciente no es de la clínica o está borrado', async () => {
    await expect(
      useCase.execute(PATIENT, 'otra-clinica', ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: 7 },
      }),
    ).rejects.toThrow(NotFoundException);

    patientActive = false;
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        templateUuid: 'template-1',
        answers: { sueno: 7 },
      }),
    ).rejects.toThrow(NotFoundException);
    expect(created).toHaveLength(0);
  });
});
