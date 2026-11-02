import { describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UpsertPatientPhysicalExamUseCase } from './upsert-patient-physical-exam.use-case';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';

describe('UpsertPatientPhysicalExamUseCase', () => {
  let existing: Record<string, unknown> | null;
  let upserts: { data: Record<string, unknown>; historyEntry: Record<string, unknown> | null }[];
  let activities: unknown[];

  const build = () => {
    const storage = {
      patientExists: (patientUuid: string) => Promise.resolve(patientUuid === PATIENT),
      findByPatient: () => Promise.resolve(existing),
      upsert: (
        _patientUuid: string,
        _actorUuid: string,
        data: Record<string, unknown>,
        historyEntry: Record<string, unknown> | null,
      ) => {
        upserts.push({ data, historyEntry });
        return Promise.resolve({ ...existing, ...data });
      },
    };
    const recordActivity = {
      execute: (input: unknown) => {
        activities.push(input);
        return Promise.resolve();
      },
    };
    return new UpsertPatientPhysicalExamUseCase(storage as never, recordActivity as never);
  };

  beforeEach(() => {
    existing = null;
    upserts = [];
    activities = [];
  });

  it('con texto en un oído crea también una entrada del historial con el mismo autor', async () => {
    await build().execute(PATIENT, TENANT, ACTOR, { otoscopyRight: '  Cerumen  ' });

    expect(upserts[0].historyEntry).toEqual({
      tenantUuid: TENANT,
      patientUuid: PATIENT,
      otoscopyRight: 'Cerumen',
      otoscopyLeft: null,
      createdByUuid: ACTOR,
    });
    expect(activities).toHaveLength(1);
  });

  it('un guardado que solo cambia un oído lleva el otro oído vigente', async () => {
    existing = { otoscopyRight: 'Normal', otoscopyLeft: null };
    await build().execute(PATIENT, TENANT, ACTOR, { otoscopyLeft: 'Cerumen' });
    expect(upserts[0].historyEntry).toMatchObject({
      otoscopyRight: 'Normal',
      otoscopyLeft: 'Cerumen',
    });
  });

  it('con los dos oídos vacíos no crea entrada', async () => {
    existing = { otoscopyRight: 'Normal', otoscopyLeft: 'Normal' };
    await build().execute(PATIENT, TENANT, ACTOR, { otoscopyRight: '   ', otoscopyLeft: '' });
    expect(upserts[0].historyEntry).toBeNull();
  });

  it('sin cambios no guarda nada ni crea entrada', async () => {
    existing = { otoscopyRight: 'Normal', otoscopyLeft: null };
    await build().execute(PATIENT, TENANT, ACTOR, { otoscopyRight: 'Normal' });
    expect(upserts).toHaveLength(0);
  });

  it('paciente de otro negocio da 404', async () => {
    await expect(
      build().execute('otro', TENANT, ACTOR, { otoscopyRight: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
