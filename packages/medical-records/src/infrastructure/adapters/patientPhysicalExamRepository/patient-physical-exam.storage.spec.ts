import { describe, it, expect } from '@jest/globals';
import { PatientPhysicalExamStorage } from './patient-physical-exam.storage';

function buildStorage(options: { failNote?: boolean } = {}) {
  const upserts: Record<string, unknown>[] = [];
  const entries: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];
  const row = (extra: Record<string, unknown>) => ({
    uuid: 'x',
    patientUuid: 'p1',
    otoscopyRight: null,
    otoscopyLeft: null,
    createdAt: new Date('2026-11-02T10:00:00.000Z'),
    updatedAt: new Date('2026-11-02T10:00:00.000Z'),
    createdByUuid: 'u1',
    updatedByUuid: 'u1',
    ...extra,
  });
  const prisma = {
    patientPhysicalExam: {
      upsert: ({ create }: { create: Record<string, unknown> }) => {
        upserts.push(create);
        return Promise.resolve(row(create));
      },
    },
    patientOtoscopyEntry: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        entries.push(data);
        return Promise.resolve(data);
      },
    },
    patientNote: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        if (options.failNote) return Promise.reject(new Error('falla la nota'));
        notes.push(data);
        return Promise.resolve(data);
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => {
      try {
        return await Promise.all(operations);
      } catch (error) {
        entries.length = 0;
        notes.length = 0;
        throw error;
      }
    },
  };
  return { storage: new PatientPhysicalExamStorage(prisma as never), upserts, entries, notes };
}

const history = {
  tenantUuid: 't1',
  patientUuid: 'p1',
  otoscopyRight: 'Limpio',
  otoscopyLeft: null,
  createdByUuid: 'u1',
};

describe('PatientPhysicalExamStorage.upsert', () => {
  it('con historial crea la entrada y la nota de Pruebas con la misma fecha', async () => {
    const { storage, entries, notes } = buildStorage();

    await storage.upsert('p1', 'u1', { otoscopyRight: 'Limpio' }, history);

    expect(entries).toHaveLength(1);
    expect(notes).toEqual([
      {
        patientUuid: 'p1',
        tenantUuid: 't1',
        authorUuid: 'u1',
        category: 'EXTERNAL_TEST',
        text: 'Otoscopia\nOD: Limpio',
        createdAt: entries[0].createdAt,
      },
    ]);
    expect(entries[0].createdAt).toBeInstanceOf(Date);
  });

  it('un oído vacío no lleva línea en la nota', async () => {
    const { storage, notes } = buildStorage();

    await storage.upsert('p1', 'u1', { otoscopyLeft: 'Cerumen' }, {
      ...history,
      otoscopyRight: null,
      otoscopyLeft: 'Cerumen',
    });

    expect(notes[0].text).toBe('Otoscopia\nOI: Cerumen');
  });

  it('sin historial (ambos oídos vacíos) no crea entrada ni nota', async () => {
    const { storage, upserts, entries, notes } = buildStorage();

    await storage.upsert('p1', 'u1', { otoscopyRight: null }, null);

    expect(upserts).toHaveLength(1);
    expect(entries).toHaveLength(0);
    expect(notes).toHaveLength(0);
  });

  it('si falla la nota, no queda la entrada', async () => {
    const { storage, entries } = buildStorage({ failNote: true });

    await expect(
      storage.upsert('p1', 'u1', { otoscopyRight: 'Limpio' }, history),
    ).rejects.toThrow('falla la nota');

    expect(entries).toHaveLength(0);
  });
});
