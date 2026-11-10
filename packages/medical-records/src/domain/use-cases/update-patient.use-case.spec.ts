import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UpdatePatientUseCase } from './update-patient.use-case';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';
const WARRANTY_DOCUMENT = '11111111-1111-4111-8111-111111111111';

function build(documentBelongs = true) {
  const stored: Record<string, unknown> = {
    uuid: PATIENT,
    firstName: 'Ana',
    lastName: 'Mora',
    bloodType: 'O+',
    warrantyDocumentUuid: null,
    branchUuid: null,
    branchUuids: [],
  };
  const writes: Record<string, unknown>[] = [];
  const storage = {
    findByUuid: () => Promise.resolve({ ...stored }),
    findByDocumentId: () => Promise.resolve(null),
    documentBelongsToPatient: () => Promise.resolve(documentBelongs),
    update: (_uuid: string, _tenant: string, dto: Record<string, unknown>) => {
      writes.push(dto);
      for (const [key, value] of Object.entries(dto)) if (value !== undefined) stored[key] = value;
      return Promise.resolve({ ...stored });
    },
  };
  const useCase = new UpdatePatientUseCase(
    storage as never,
    { findUuidsInTenant: () => Promise.resolve([]) } as never,
    { execute: () => Promise.resolve() } as never,
  );
  return { useCase, stored, writes };
}

describe('UpdatePatientUseCase: campos clínicos según si atiende pacientes', () => {
  it('quien no atiende pacientes manda bloodType y no cambia', async () => {
    const { useCase, stored, writes } = build();

    const result = await useCase.execute(
      PATIENT,
      TENANT,
      { firstName: 'Ana María', bloodType: 'AB-' } as never,
      ACTOR,
      false,
    );

    expect(stored.bloodType).toBe('O+');
    expect(stored.firstName).toBe('Ana María');
    expect(result.firstName).toBe('Ana María');
    expect(writes[0]).not.toHaveProperty('bloodType');
  });

  it('quien no atiende pacientes manda warrantyDocumentUuid: se ignora sin error ni consulta', async () => {
    const { useCase, stored } = build(false);

    await useCase.execute(
      PATIENT,
      TENANT,
      { warrantyDocumentUuid: WARRANTY_DOCUMENT } as never,
      ACTOR,
      false,
    );

    expect(stored.warrantyDocumentUuid).toBeNull();
  });

  it('quien atiende pacientes sí guarda bloodType y la garantía', async () => {
    const { useCase, stored } = build();

    await useCase.execute(
      PATIENT,
      TENANT,
      { bloodType: 'AB-', warrantyDocumentUuid: WARRANTY_DOCUMENT } as never,
      ACTOR,
      true,
    );

    expect(stored.bloodType).toBe('AB-');
    expect(stored.warrantyDocumentUuid).toBe(WARRANTY_DOCUMENT);
  });

  it('quien atiende pacientes sigue recibiendo 400 si la garantía no es del expediente', async () => {
    const { useCase } = build(false);

    await expect(
      useCase.execute(
        PATIENT,
        TENANT,
        { warrantyDocumentUuid: WARRANTY_DOCUMENT } as never,
        ACTOR,
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
