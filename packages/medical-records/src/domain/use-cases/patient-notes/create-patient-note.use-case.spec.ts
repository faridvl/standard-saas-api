import { describe, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CreatePatientNoteUseCase } from './create-patient-note.use-case';

const TENANT = 'tenant-1';
const OTHER_TENANT_PATIENT = 'patient-de-otro-tenant';
const OWN_PATIENT = 'patient-1';

describe('CreatePatientNoteUseCase: aislamiento entre clínicas', () => {
  const build = () => {
    const create = jest
      .fn()
      .mockImplementation((data: object) =>
        Promise.resolve({ uuid: 'note-1', category: 'GENERAL', text: 'intruso', ...data }),
      );
    const storage = {
      patientExists: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve(patientUuid === OWN_PATIENT && tenantUuid === TENANT),
      create,
    };
    const record = jest.fn().mockResolvedValue(undefined);
    const useCase = new CreatePatientNoteUseCase(
      storage as never,
      { execute: () => Promise.resolve('Dra. Ana') } as never,
      { execute: record } as never,
    );
    return { useCase, create, record };
  };

  const input = (patientUuid: string) => ({
    patientUuid,
    tenantUuid: TENANT,
    authorUuid: 'user-1',
    category: 'GENERAL' as never,
    text: 'intruso',
  });

  it('un paciente de otro tenant responde 404 y no crea la nota ni la bitácora', async () => {
    const { useCase, create, record } = build();

    await expect(useCase.execute(input(OTHER_TENANT_PATIENT))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('un paciente del tenant crea la nota', async () => {
    const { useCase, create } = build();

    const note = await useCase.execute(input(OWN_PATIENT));

    expect(create).toHaveBeenCalledTimes(1);
    expect(note.authorName).toBe('Dra. Ana');
  });
});
