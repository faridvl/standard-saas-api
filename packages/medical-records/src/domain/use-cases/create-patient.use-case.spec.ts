import { describe, expect, it } from '@jest/globals';
import { CreatePatientUseCase } from './create-patient.use-case';

const CONTEXT = { tenantId: 1, tenantUuid: 'tenant-1', sub: 'user-1' };

function build() {
  const saved: Record<string, unknown>[] = [];
  const storage = {
    findByDocumentId: () => Promise.resolve(null),
    saveWithBranches: (data: Record<string, unknown>) => {
      saved.push(data);
      return Promise.resolve({ uuid: 'patient-1', ...data, bloodType: data.bloodType ?? null });
    },
  };
  const useCase = new CreatePatientUseCase(
    storage as never,
    { createMany: () => Promise.resolve() } as never,
    {
      findUuidsInTenant: () => Promise.resolve([]),
      findInactiveUuids: () => Promise.resolve([]),
    } as never,
    { execute: () => Promise.resolve() } as never,
  );
  return { useCase, saved };
}

describe('CreatePatientUseCase: tipo de sangre según si atiende pacientes', () => {
  const input = { firstName: 'Ana', lastName: 'Mora', bloodType: 'O+' } as never;

  it('Recepción que no atiende pacientes crea el paciente con bloodType nulo', async () => {
    const { useCase, saved } = build();

    const patient = await useCase.execute(input, { ...CONTEXT, attendsPatients: false });

    expect(saved[0].bloodType).toBeUndefined();
    expect(patient.bloodType).toBeNull();
  });

  it('quien atiende pacientes guarda el tipo de sangre', async () => {
    const { useCase, saved } = build();

    const patient = await useCase.execute(input, { ...CONTEXT, attendsPatients: true });

    expect(saved[0].bloodType).toBe('O+');
    expect(patient.bloodType).toBe('O+');
  });
});
