import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { assertBranchesActive } from './patient-branches';
import { CreatePatientUseCase } from '@medical-records/domain/use-cases/create-patient.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { CreateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/create-appointment.use-case';
import { ScheduleNextAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/schedule-next-appointment.use-case';
import { UpdateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/update-appointment.use-case';

describe('assertBranchesActive', () => {
  it('rechaza una sede desactivada que no se tenía', () => {
    expect(() => assertBranchesActive(['b1'], ['b1'])).toThrow(BadRequestException);
  });

  it('acepta sedes activas y las desactivadas que ya se tenían', () => {
    expect(() => assertBranchesActive(['b1', 'b2'], [])).not.toThrow();
    expect(() => assertBranchesActive(['b1', 'b2'], ['b1'], ['b1'])).not.toThrow();
    expect(() => assertBranchesActive(['b1'], ['b1'], [null, undefined])).toThrow(
      BadRequestException,
    );
  });
});

describe('Sede desactivada en registros nuevos', () => {
  const INACTIVE = 'sede-inactiva';
  const branchStorage = {
    findUuidsInTenant: (_tenant: string, uuids: string[]) => Promise.resolve(uuids),
    findInactiveUuids: (_tenant: string, uuids: string[]) =>
      Promise.resolve(uuids.filter((uuid) => uuid === INACTIVE || uuid === 'otra-inactiva')),
  };
  const appointmentDto = {
    patientUUID: 'p1',
    userUUID: 'u1',
    branchUUID: INACTIVE,
    date: '2030-01-15',
    startTime: '2030-01-15T15:00:00.000Z',
    endTime: '2030-01-15T15:30:00.000Z',
  };

  it('crear paciente en una sede desactivada se rechaza antes de guardar', async () => {
    const storage = {
      findByDocumentId: () => Promise.resolve(null),
      saveWithBranches: () => {
        throw new Error('no debía guardar');
      },
    };
    const useCase = new CreatePatientUseCase(
      storage as never,
      {} as never,
      branchStorage as never,
      {} as never,
    );

    await expect(
      useCase.execute({ firstName: 'Ana', lastName: 'Mora', branchUuids: [INACTIVE] } as never, {
        tenantId: 1,
        tenantUuid: 't1',
        sub: 'u1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('editar un paciente que ya tenía la sede desactivada sigue funcionando', async () => {
    const existing = {
      uuid: 'p1',
      branchUuid: INACTIVE,
      branchUuids: [INACTIVE],
      firstName: 'Ana',
      lastName: 'Mora',
    };
    const updated = { ...existing, firstName: 'Anita' };
    const storage = {
      findByUuid: () => Promise.resolve(existing),
      update: () => Promise.resolve(updated),
    };
    const useCase = buildUpdatePatient(storage, branchStorage);

    await expect(
      useCase.execute('p1', 't1', {
        firstName: 'Anita',
        branchUuids: [INACTIVE],
      } as never),
    ).resolves.toBeDefined();
  });

  it('agregar a un paciente existente una sede desactivada nueva se rechaza', async () => {
    const existing = { uuid: 'p1', branchUuid: 'sede-activa', branchUuids: ['sede-activa'] };
    const storage = { findByUuid: () => Promise.resolve(existing) };
    const useCase = buildUpdatePatient(storage, branchStorage);

    await expect(
      useCase.execute('p1', 't1', { branchUuids: ['sede-activa', INACTIVE] } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crear una cita nueva en una sede desactivada se rechaza', async () => {
    const patientStorage = { findBranchUuids: () => Promise.resolve([INACTIVE]) };
    const useCase = new CreateAppointmentUseCase(
      { create: () => Promise.reject(new Error('no debía guardar')) } as never,
      patientStorage as never,
      branchStorage as never,
      {} as never,
      {} as never,
    );

    await expect(useCase.execute('t1', appointmentDto as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('agendar la siguiente cita rechaza la sede desactivada nueva y acepta la ya vigente', async () => {
    const patient = (nextBranch: string | null) => ({
      uuid: 'p1',
      status: 'ACTIVE',
      branchUuids: [INACTIVE],
      nextAppointmentBranchUuid: nextBranch,
    });
    const build = (nextBranch: string | null) =>
      new ScheduleNextAppointmentUseCase(
        {
          cancelConfirmedFutureByPatient: () => Promise.reject(new Error('llegó a guardar')),
        } as never,
        { findByUuid: () => Promise.resolve(patient(nextBranch)) } as never,
        branchStorage as never,
        {} as never,
        {} as never,
        {} as never,
      );
    const dto = { date: '2030-01-15', branchUUID: INACTIVE } as never;

    await expect(build(null).execute('p1', 't1', 'u1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Con la sede ya vigente pasa la validación de sede y falla más adelante en el fake.
    await expect(build(INACTIVE).execute('p1', 't1', 'u1', dto)).rejects.toThrow('llegó a guardar');
  });

  it('cambiar la sede de una cita a una desactivada se rechaza; conservarla no valida sede', async () => {
    const build = () =>
      new UpdateAppointmentUseCase(
        {
          findOne: () => Promise.resolve({ patientUUID: 'p1', branchUUID: INACTIVE }),
          update: () => Promise.resolve({ patientUUID: 'p1', branchUUID: INACTIVE }),
        } as never,
        { findBranchUuids: () => Promise.resolve([INACTIVE, 'otra-inactiva']) } as never,
        branchStorage as never,
        { execute: () => Promise.resolve() } as never,
      );

    await expect(
      build().execute('a1', 't1', { branchUUID: 'otra-inactiva' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      build().execute('a1', 't1', { branchUUID: INACTIVE, notes: 'x' } as never),
    ).resolves.toBeDefined();
  });
});

function buildUpdatePatient(
  storage: Record<string, unknown>,
  branchStorage: Record<string, unknown>,
): UpdatePatientUseCase {
  return new UpdatePatientUseCase(
    storage as never,
    branchStorage as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}
