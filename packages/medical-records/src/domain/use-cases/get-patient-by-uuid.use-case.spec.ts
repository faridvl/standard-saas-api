import { describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { GetPatientByUuidUseCase } from './get-patient-by-uuid.use-case';
import { GetPatientsUseCase } from './get-patients.use-case';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

const record = { uuid: 'p-1', firstName: 'Ana', bloodType: 'O+' };

const storage = {
  findByUuid: (uuid: string) => Promise.resolve(uuid === 'p-1' ? { ...record } : null),
  findAllByTenant: () =>
    Promise.resolve({
      data: [{ ...record }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    }),
} as unknown as PatientStorage;

describe('paciente general y campos clínicos', () => {
  const detail = new GetPatientByUuidUseCase(storage);
  const list = new GetPatientsUseCase(storage);

  it('el detalle omite bloodType si no atiende pacientes', async () => {
    expect(await detail.execute('p-1', 't-1', false)).not.toHaveProperty('bloodType');
  });

  it('el detalle lo devuelve si atiende pacientes', async () => {
    expect(await detail.execute('p-1', 't-1', true)).toHaveProperty('bloodType', 'O+');
  });

  it('un paciente inexistente sigue dando 404', async () => {
    await expect(detail.execute('x', 't-1', true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el listado omite bloodType si no atiende y lo trae si atiende', async () => {
    const without = await list.execute('t-1', 1, 10, false, undefined, undefined, {}, false);
    const withClinical = await list.execute('t-1', 1, 10, false, undefined, undefined, {}, true);
    expect(without.data[0]).not.toHaveProperty('bloodType');
    expect(without.meta.total).toBe(1);
    expect(withClinical.data[0]).toHaveProperty('bloodType', 'O+');
  });
});
