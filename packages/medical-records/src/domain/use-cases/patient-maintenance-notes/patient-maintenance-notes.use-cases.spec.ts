import { describe, it, expect, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CreatePatientMaintenanceNoteUseCase } from './create-patient-maintenance-note.use-case';
import { FindPatientMaintenancesUseCase } from './find-patient-maintenances.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';
import {
  CreatePatientMaintenanceNoteSchema,
  MaintenanceNumberSchema,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';

describe('notas de mantenimiento', () => {
  let notes: Record<string, unknown>[];
  let activities: Record<string, unknown>[];
  let create: CreatePatientMaintenanceNoteUseCase;
  let find: FindPatientMaintenancesUseCase;

  beforeEach(() => {
    notes = [];
    activities = [];

    const storage = {
      patientExists: (uuid: string, tenantUuid: string) =>
        Promise.resolve(uuid === PATIENT && tenantUuid === TENANT),
      findStatuses: (uuid: string, tenantUuid: string) =>
        Promise.resolve(
          uuid === PATIENT && tenantUuid === TENANT
            ? ['UNMARKED', 'MISSED', 'ATTENDED', 'UNMARKED']
            : null,
        ),
      create: (data: Record<string, unknown>) => {
        const note = {
          uuid: `note-${notes.length + 1}`,
          createdAt: new Date(2026, 10, 1, 10, notes.length),
          ...data,
        };
        notes.unshift(note);
        return Promise.resolve(note);
      },
      findAllByPatient: () => Promise.resolve(notes),
    };
    const getOrCreateUser = {
      execute: (uuid: string) => Promise.resolve(uuid === ACTOR ? 'Dra. Ana' : null),
    };
    const recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };

    create = new CreatePatientMaintenanceNoteUseCase(
      storage as never,
      getOrCreateUser as never,
      recordActivity as never,
    );
    find = new FindPatientMaintenancesUseCase(storage as never, getOrCreateUser as never);
  });

  it('agrega la nota, devuelve el autor y deja el evento sin el texto', async () => {
    const result = await create.execute(PATIENT, TENANT, ACTOR, 2, { text: 'Llamar en enero' });

    expect(result).toMatchObject({
      text: 'Llamar en enero',
      createdByUuid: ACTOR,
      createdByName: 'Dra. Ana',
    });
    expect(activities).toEqual([
      {
        tenantUuid: TENANT,
        patientUuid: PATIENT,
        actorUuid: ACTOR,
        action: PatientActivityAction.MAINTENANCE_NOTE_ADDED,
        detail: { number: 2 },
      },
    ]);
    expect(JSON.stringify(activities)).not.toContain('Llamar en enero');
  });

  it('un paciente de otra clínica responde Paciente no encontrado', async () => {
    await expect(create.execute(PATIENT, 'otra', ACTOR, 1, { text: 'x' })).rejects.toThrow(
      new NotFoundException('Paciente no encontrado'),
    );
    await expect(find.execute(PATIENT, 'otra')).rejects.toThrow(NotFoundException);
    expect(notes).toEqual([]);
    expect(activities).toEqual([]);
  });

  it('lista los cuatro mantenimientos con su estado y las notas de la más nueva a la más vieja', async () => {
    await create.execute(PATIENT, TENANT, ACTOR, 2, { text: 'Primera' });
    await create.execute(PATIENT, TENANT, ACTOR, 2, { text: 'Segunda' });
    await create.execute(PATIENT, TENANT, ACTOR, 4, { text: 'Otra' });

    const result = await find.execute(PATIENT, TENANT);

    expect(result.map((m) => [m.number, m.status])).toEqual([
      [1, 'UNMARKED'],
      [2, 'MISSED'],
      [3, 'ATTENDED'],
      [4, 'UNMARKED'],
    ]);
    expect(result[0].notes).toEqual([]);
    expect(result[1].notes.map((n) => n.text)).toEqual(['Segunda', 'Primera']);
    expect(result[1].notes[0].createdByName).toBe('Dra. Ana');
    expect(result[3].notes.map((n) => n.text)).toEqual(['Otra']);
  });
});

describe('validación de notas de mantenimiento', () => {
  it('recorta el texto y rechaza vacío o de más de 500 caracteres', () => {
    expect(CreatePatientMaintenanceNoteSchema.parse({ text: '  hola  ' })).toEqual({
      text: 'hola',
    });
    expect(CreatePatientMaintenanceNoteSchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(CreatePatientMaintenanceNoteSchema.safeParse({}).success).toBe(false);
    expect(CreatePatientMaintenanceNoteSchema.safeParse({ text: 'a'.repeat(500) }).success).toBe(
      true,
    );
    expect(CreatePatientMaintenanceNoteSchema.safeParse({ text: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('acepta solo los mantenimientos 1 a 4', () => {
    expect(MaintenanceNumberSchema.safeParse('4').success).toBe(true);
    expect(MaintenanceNumberSchema.safeParse('0').success).toBe(false);
    expect(MaintenanceNumberSchema.safeParse('5').success).toBe(false);
  });
});
