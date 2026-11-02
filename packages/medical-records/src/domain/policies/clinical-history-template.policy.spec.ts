import { describe, it, expect } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import {
  assertCanEditTemplate,
  CLINICAL_HISTORY_SPECIALITY,
  QUESTIONNAIRE_SPECIALITY,
} from './clinical-history-template.policy';

describe('assertCanEditTemplate', () => {
  it('STAFF no edita una sección QUESTIONNAIRE', () => {
    expect(() => assertCanEditTemplate(QUESTIONNAIRE_SPECIALITY, 'STAFF')).toThrow(
      ForbiddenException,
    );
  });

  it('sin rol tampoco edita una sección QUESTIONNAIRE', () => {
    expect(() => assertCanEditTemplate(QUESTIONNAIRE_SPECIALITY, null)).toThrow(ForbiddenException);
  });

  it('STAFF no edita la historia clínica', () => {
    expect(() => assertCanEditTemplate(CLINICAL_HISTORY_SPECIALITY, 'STAFF')).toThrow(
      ForbiddenException,
    );
  });

  it.each(['OWNER', 'ADMIN', 'DOCTOR'])('%s sí edita una sección QUESTIONNAIRE', (role) => {
    expect(() => assertCanEditTemplate(QUESTIONNAIRE_SPECIALITY, role)).not.toThrow();
  });

  it('las demás plantillas siguen abiertas a cualquier rol', () => {
    expect(() => assertCanEditTemplate('OTRA', 'STAFF')).not.toThrow();
    expect(() => assertCanEditTemplate(undefined, 'STAFF')).not.toThrow();
  });
});
