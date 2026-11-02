import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePatientOtoscopyEntryUseCase } from './create-patient-otoscopy-entry.use-case';
import { FindPatientOtoscopyEntriesUseCase } from './find-patient-otoscopy-entries.use-case';
import { UpdatePatientOtoscopyEntryUseCase } from './update-patient-otoscopy-entry.use-case';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ENTRY = 'entry-1';
const AUTHOR = 'user-author';
const CORRECTOR = 'user-corrector';

// Costa Rica es UTC-6: 01-nov 10:00 CR.
const CREATED_AT = '2026-11-01T16:00:00.000Z';
const SAME_DAY = new Date('2026-11-02T05:59:00.000Z'); // 01-nov 23:59 CR
const NEXT_DAY = new Date('2026-11-02T06:05:00.000Z'); // 02-nov 00:05 CR

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    uuid: ENTRY,
    patientUuid: PATIENT,
    otoscopyRight: 'Conducto limpio',
    otoscopyLeft: null as string | null,
    createdAt: CREATED_AT,
    createdByUuid: AUTHOR as string | null,
    updatedAt: null,
    updatedByUuid: null,
    ...overrides,
  };
}

describe('historial de otoscopias', () => {
  let records: ReturnType<typeof buildRecord>[];
  let created: Record<string, unknown>[];
  let updates: { entryUuid: string; tenantUuid: string; data: Record<string, unknown> }[];
  let activities: Record<string, unknown>[];
  let storage: Record<string, unknown>;
  let getOrCreateUser: { execute: (uuid: string) => Promise<string | null> };
  let recordActivity: { execute: (input: Record<string, unknown>) => Promise<void> };

  beforeEach(() => {
    records = [buildRecord()];
    created = [];
    updates = [];
    activities = [];

    storage = {
      patientExists: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve(patientUuid === PATIENT && tenantUuid === TENANT),
      findAllByPatient: () => Promise.resolve(records),
      findByUuid: (entryUuid: string, patientUuid: string) =>
        Promise.resolve(
          records.find((r) => r.uuid === entryUuid && r.patientUuid === patientUuid) ?? null,
        ),
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(buildRecord({ ...data, uuid: 'entry-new' }));
      },
      // Imita al storage real: lee la fila, deja decidir al caso de uso y guarda si hay cambios.
      update: (
        entryUuid: string,
        patientUuid: string,
        tenantUuid: string,
        plan: (current: ReturnType<typeof buildRecord>) => {
          data: Record<string, unknown>;
          changes: unknown[];
        },
      ) => {
        const current = records.find((r) => r.uuid === entryUuid && r.patientUuid === patientUuid);
        if (!current) return Promise.reject(new NotFoundException('Registro no encontrado'));
        const { data, changes } = plan(current);
        if (changes.length === 0) return Promise.resolve({ entry: current, changes });
        updates.push({ entryUuid, tenantUuid, data });
        return Promise.resolve({
          entry: { ...current, ...data, updatedAt: SAME_DAY.toISOString() },
          changes,
        });
      },
    };
    const names: Record<string, string> = { [AUTHOR]: 'Dra. Ana', [CORRECTOR]: 'Dr. Luis' };
    getOrCreateUser = { execute: (uuid: string) => Promise.resolve(names[uuid] ?? null) };
    recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };
  });

  describe('listar', () => {
    const build = () =>
      new FindPatientOtoscopyEntriesUseCase(storage as never, getOrCreateUser as never);

    it('devuelve el autor y marca canEdit solo el mismo día', async () => {
      const sameDay = await build().execute(PATIENT, TENANT, SAME_DAY);
      expect(sameDay[0]).toMatchObject({ createdByName: 'Dra. Ana', canEdit: true });

      const nextDay = await build().execute(PATIENT, TENANT, NEXT_DAY);
      expect(nextDay[0].canEdit).toBe(false);
    });

    it('consulta a identity una sola vez por autor, aunque se repita', async () => {
      records = [
        buildRecord({ uuid: 'a' }),
        buildRecord({ uuid: 'b', updatedByUuid: CORRECTOR }),
        buildRecord({ uuid: 'c', updatedByUuid: CORRECTOR }),
      ];
      const lookups: string[] = [];
      getOrCreateUser = {
        execute: (uuid: string) => {
          lookups.push(uuid);
          return Promise.resolve(uuid);
        },
      };
      const result = await build().execute(PATIENT, TENANT, SAME_DAY);
      expect([...lookups].sort()).toEqual([AUTHOR, CORRECTOR].sort());
      expect(result[1]).toMatchObject({ createdByName: AUTHOR, updatedByName: CORRECTOR });
    });

    it('tolera un registro sin autor', async () => {
      records = [buildRecord({ createdByUuid: null })];
      const result = await build().execute(PATIENT, TENANT, SAME_DAY);
      expect(result[0].createdByName).toBeNull();
    });

    it('paciente de otro negocio o borrado da 404', async () => {
      await expect(build().execute(PATIENT, 'otro-tenant')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('crear', () => {
    const build = () =>
      new CreatePatientOtoscopyEntryUseCase(
        storage as never,
        getOrCreateUser as never,
        recordActivity as never,
      );

    it('crea un registro nuevo con el autor del token y lo anota en la bitácora', async () => {
      const result = await build().execute(PATIENT, TENANT, AUTHOR, {
        otoscopyRight: 'Tímpano íntegro',
      });

      expect(created[0]).toEqual({
        tenantUuid: TENANT,
        patientUuid: PATIENT,
        otoscopyRight: 'Tímpano íntegro',
        otoscopyLeft: null,
        createdByUuid: AUTHOR,
      });
      expect(result).toMatchObject({ createdByName: 'Dra. Ana', canEdit: true, updatedAt: null });
      expect(activities).toHaveLength(1);
    });

    it('paciente inexistente da 404 y no guarda nada', async () => {
      await expect(
        build().execute('otro', TENANT, AUTHOR, { otoscopyLeft: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(created).toHaveLength(0);
    });
  });

  describe('corregir', () => {
    const build = () =>
      new UpdatePatientOtoscopyEntryUseCase(
        storage as never,
        getOrCreateUser as never,
        recordActivity as never,
      );

    it('corrige el mismo día y deja quién y cuándo', async () => {
      const result = await build().execute(
        PATIENT,
        ENTRY,
        TENANT,
        CORRECTOR,
        { otoscopyLeft: 'Cerumen' },
        SAME_DAY,
      );

      expect(updates).toHaveLength(1);
      expect(updates[0].data).toMatchObject({
        otoscopyRight: 'Conducto limpio',
        otoscopyLeft: 'Cerumen',
        updatedAt: SAME_DAY,
        updatedByUuid: CORRECTOR,
      });
      expect(result).toMatchObject({ updatedByName: 'Dr. Luis', createdByName: 'Dra. Ana' });
      expect(activities).toHaveLength(1);
    });

    it('otro día da 409 y no cambia nada', async () => {
      await expect(
        build().execute(PATIENT, ENTRY, TENANT, CORRECTOR, { otoscopyLeft: 'x' }, NEXT_DAY),
      ).rejects.toThrow('Esta otoscopia ya no se puede corregir porque no es de hoy.');
      expect(updates).toHaveLength(0);
    });

    it('sin cambios reales no guarda revisión', async () => {
      await build().execute(
        PATIENT,
        ENTRY,
        TENANT,
        CORRECTOR,
        { otoscopyRight: 'Conducto limpio' },
        SAME_DAY,
      );
      expect(updates).toHaveLength(0);
      expect(activities).toHaveLength(0);
    });

    it('no deja el registro sin ningún oído', async () => {
      await expect(
        build().execute(PATIENT, ENTRY, TENANT, CORRECTOR, { otoscopyRight: null }, SAME_DAY),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('registro o paciente inexistente da 404', async () => {
      await expect(
        build().execute(PATIENT, 'nada', TENANT, CORRECTOR, { otoscopyLeft: 'x' }, SAME_DAY),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        build().execute('otro', ENTRY, TENANT, CORRECTOR, { otoscopyLeft: 'x' }, SAME_DAY),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
