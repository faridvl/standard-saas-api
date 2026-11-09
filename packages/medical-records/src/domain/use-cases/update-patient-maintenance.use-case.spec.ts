import { describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UpdatePatientMaintenanceUseCase } from './update-patient-maintenance.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';

describe('UpdatePatientMaintenanceUseCase', () => {
  let patient: Record<string, unknown> | null;
  let updates: { number: number; status: string }[];
  let activities: Record<string, unknown>[];
  let useCase: UpdatePatientMaintenanceUseCase;

  beforeEach(() => {
    patient = {
      uuid: PATIENT,
      deletedAt: null,
      maintenance1Status: 'UNMARKED',
      maintenance2Status: 'ATTENDED',
    };
    updates = [];
    activities = [];

    const storage = {
      findByUuid: (uuid: string, tenantUuid: string) =>
        Promise.resolve(uuid === PATIENT && tenantUuid === TENANT ? patient : null),
      updateMaintenance: (_uuid: string, _tenant: string, number: number, status: string) => {
        updates.push({ number, status });
        return Promise.resolve({ ...patient, [`maintenance${number}Status`]: status });
      },
    };
    const recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };
    useCase = new UpdatePatientMaintenanceUseCase(storage as never, recordActivity as never);
  });

  it('cambia el estado y deja el evento con el estado nuevo y el anterior', async () => {
    const result = await useCase.execute(PATIENT, TENANT, ACTOR, 1, { status: 'MISSED' } as never);

    expect(updates).toEqual([{ number: 1, status: 'MISSED' }]);
    expect(result).toMatchObject({ maintenance1Status: 'MISSED' });
    expect(activities).toEqual([
      {
        tenantUuid: TENANT,
        patientUuid: PATIENT,
        actorUuid: ACTOR,
        action: PatientActivityAction.MAINTENANCE_CHANGED,
        detail: { number: 1, status: 'MISSED', previousStatus: 'UNMARKED' },
      },
    ]);
  });

  it('si el estado es el mismo no escribe ni deja evento', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, 2, { status: 'ATTENDED' } as never);

    expect(updates).toEqual([]);
    expect(activities).toEqual([]);
  });

  it('un paciente de otra clínica o borrado responde Paciente no encontrado', async () => {
    await expect(
      useCase.execute(PATIENT, 'otra-clinica', ACTOR, 1, { status: 'ATTENDED' } as never),
    ).rejects.toThrow(new NotFoundException('Paciente no encontrado'));

    patient = { ...patient, deletedAt: new Date() };
    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, 1, { status: 'ATTENDED' } as never),
    ).rejects.toThrow(NotFoundException);
  });
});
