import { describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from './patient-otoscopy-entry.storage';

const NOW = new Date('2026-11-02T10:00:00.000Z');

function buildStorage(lockedRows: { id: number }[], currentText: string) {
  const calls: string[] = [];
  const revisions: Record<string, unknown>[] = [];
  const transaction = {
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push(`lock:${strings.join('?').includes('FOR UPDATE')}:${values.join(',')}`);
      return Promise.resolve(lockedRows);
    },
    patientOtoscopyEntry: {
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
  const prisma = { $transaction: (fn: (t: typeof transaction) => unknown) => fn(transaction) };
  return { storage: new PatientOtoscopyEntryStorage(prisma as never), calls, revisions };
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
