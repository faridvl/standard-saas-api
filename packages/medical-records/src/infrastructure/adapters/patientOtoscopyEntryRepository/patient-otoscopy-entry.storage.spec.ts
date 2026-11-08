import { describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from './patient-otoscopy-entry.storage';

const NOW = new Date('2026-11-02T10:00:00.000Z');

function buildStorage(lockedRows: { id: number }[], currentText: string) {
  const calls: string[] = [];
  const revisions: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];
  const created: Record<string, unknown>[] = [];
  let failNote = false;
  const transaction = {
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push(`lock:${strings.join('?').includes('FOR UPDATE')}:${values.join(',')}`);
      return Promise.resolve(lockedRows);
    },
    patientNote: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        calls.push('note');
        if (failNote) return Promise.reject(new Error('falla la nota'));
        notes.push(data);
        return Promise.resolve(data);
      },
    },
    patientOtoscopyEntry: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        calls.push('create');
        created.push(data);
        return Promise.resolve({ uuid: 'e-new', createdAt: NOW, updatedAt: null, ...data });
      },
      findFirstOrThrow: ({ where }: { where: Record<string, unknown> }) => {
        calls.push(`read:${String(where.patientUuid)}`);
        return Promise.resolve({
          uuid: 'e1',
          patientUuid: 'p1',
          tenantUuid: 't1',
          otoscopyRight: currentText,
          otoscopyLeft: null,
          createdAt: NOW,
          createdByUuid: 'u1',
          updatedAt: null,
          updatedByUuid: null,
        });
      },
      update: ({ data }: { data: Record<string, unknown> }) => {
        calls.push('update');
        return Promise.resolve({
          uuid: 'e1',
          patientUuid: 'p1',
          createdAt: NOW,
          createdByUuid: 'u1',
          ...data,
        });
      },
    },
    patientOtoscopyEntryRevision: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        calls.push('revision');
        revisions.push(data);
        return Promise.resolve(data);
      },
    },
  };
  // Imita el rollback: si la transacción falla, lo escrito dentro se descarta.
  const prisma = {
    $transaction: async (fn: (t: typeof transaction) => Promise<unknown>) => {
      try {
        return await fn(transaction);
      } catch (error) {
        created.length = 0;
        notes.length = 0;
        throw error;
      }
    },
  };
  return {
    storage: new PatientOtoscopyEntryStorage(prisma as never),
    calls,
    revisions,
    notes,
    created,
    failNextNote: () => {
      failNote = true;
    },
  };
}

describe('PatientOtoscopyEntryStorage.update', () => {
  it('bloquea la fila y guarda en la revisión el texto leído con el bloqueo', async () => {
    const { storage, calls, revisions } = buildStorage([{ id: 1 }], 'Texto de la otra corrección');

    const result = await storage.update('e1', 'p1', 't1', (current) => ({
      data: {
        otoscopyRight: 'Nuevo',
        otoscopyLeft: null,
        updatedAt: NOW,
        updatedByUuid: 'u2',
      },
      changes: [{ field: 'otoscopyRight', before: current.otoscopyRight, after: 'Nuevo' }],
    }));

    expect(calls).toEqual(['lock:true:e1,t1,p1', 'read:p1', 'revision', 'update']);
    expect(revisions[0]).toMatchObject({ otoscopyRight: 'Texto de la otra corrección' });
    expect(result.changes[0]).toMatchObject({ before: 'Texto de la otra corrección' });
    expect(result.entry.otoscopyRight).toBe('Nuevo');
  });

  it('sin cambios no escribe revisión ni actualiza', async () => {
    const { storage, calls } = buildStorage([{ id: 1 }], 'Igual');
    await storage.update('e1', 'p1', 't1', () => ({
      data: { otoscopyRight: 'Igual', otoscopyLeft: null, updatedAt: NOW, updatedByUuid: 'u2' },
      changes: [],
    }));
    expect(calls).not.toContain('revision');
    expect(calls).not.toContain('update');
  });

  it('fila que no existe para ese paciente y negocio da 404', async () => {
    const { storage } = buildStorage([], 'x');
    await expect(
      storage.update('e1', 'otro', 't1', () => {
        throw new Error('no debe llamarse');
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PatientOtoscopyEntryStorage.create', () => {
  const base = { tenantUuid: 't1', patientUuid: 'p1', createdByUuid: 'u1' };

  it('crea el registro y exactamente una nota de Pruebas con el texto de ambos oídos', async () => {
    const { storage, notes, calls } = buildStorage([], 'x');

    await storage.create({ ...base, otoscopyRight: 'Tímpano íntegro', otoscopyLeft: 'Cerumen' });

    expect(calls).toEqual(['create', 'note']);
    expect(notes).toEqual([
      {
        patientUuid: 'p1',
        tenantUuid: 't1',
        authorUuid: 'u1',
        category: 'EXTERNAL_TEST',
        text: 'Otoscopia\nOD: Tímpano íntegro\nOI: Cerumen',
      },
    ]);
  });

  it('omite la línea del oído vacío', async () => {
    const { storage, notes } = buildStorage([], 'x');

    await storage.create({ ...base, otoscopyRight: null, otoscopyLeft: 'Cerumen' });
    await storage.create({ ...base, otoscopyRight: 'Limpio', otoscopyLeft: null });

    expect(notes.map((note) => note.text)).toEqual([
      'Otoscopia\nOI: Cerumen',
      'Otoscopia\nOD: Limpio',
    ]);
  });

  it('si falla la nota, falla todo y no queda el registro', async () => {
    const { storage, created, notes, failNextNote } = buildStorage([], 'x');
    failNextNote();

    await expect(
      storage.create({ ...base, otoscopyRight: 'Limpio', otoscopyLeft: null }),
    ).rejects.toThrow('falla la nota');

    expect(created).toHaveLength(0);
    expect(notes).toHaveLength(0);
  });

  it('corregir no crea ni cambia ninguna nota', async () => {
    const { storage, calls } = buildStorage([{ id: 1 }], 'Antes');

    await storage.update('e1', 'p1', 't1', () => ({
      data: { otoscopyRight: 'Después', otoscopyLeft: null, updatedAt: NOW, updatedByUuid: 'u2' },
      changes: [{ field: 'otoscopyRight', before: 'Antes', after: 'Después' }],
    }));

    expect(calls).not.toContain('note');
  });
});
