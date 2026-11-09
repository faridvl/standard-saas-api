import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatientQuestionnaireEntryStorage } from './patient-questionnaire-entry.storage';

const ENTRY = 'entry-1';
const TENANT = 'tenant-1';

type Answers = Record<string, unknown>;
type Row = {
  uuid: string;
  patientUuid: string;
  templateUuid: string;
  templateSnapshot: unknown;
  answers: Answers;
  createdAt: Date;
  createdByUuid: string;
  updatedAt: Date | null;
  updatedByUuid: string | null;
};
type Revision = {
  entryUuid: string;
  tenantUuid: string;
  answers: Answers;
  revisedAt: Date;
  revisedByUuid: string;
};

/** Prisma falso con transacción real: si el callback lanza, se descartan sus escrituras. */
function buildPrisma() {
  const state: { entry: Row; revisions: Revision[] } = {
    entry: {
      uuid: ENTRY,
      patientUuid: 'patient-1',
      templateUuid: 'template-1',
      templateSnapshot: { name: 'Hábitos', fields: [] },
      answers: { sueno: 7 },
      createdAt: new Date('2026-11-01T16:00:00.000Z'),
      createdByUuid: 'user-author',
      updatedAt: null,
      updatedByUuid: null,
    },
    revisions: [],
  };
  const failure = { onUpdate: false };

  const buildClient = (draft: typeof state) => ({
    patientQuestionnaireEntry: {
      findUniqueOrThrow: () => Promise.resolve({ answers: draft.entry.answers }),
      update: ({ data }: { data: Partial<Row> }) => {
        if (failure.onUpdate) return Promise.reject(new Error('fallo al actualizar'));
        draft.entry = { ...draft.entry, ...data };
        return Promise.resolve(draft.entry);
      },
    },
    patientQuestionnaireEntryRevision: {
      create: ({ data }: { data: Revision }) => {
        draft.revisions.push(data);
        return Promise.resolve(data);
      },
    },
  });

  const prisma = {
    $transaction: async (
      callback: (client: ReturnType<typeof buildClient>) => Promise<unknown>,
    ) => {
      const draft = { entry: { ...state.entry }, revisions: [...state.revisions] };
      const result = await callback(buildClient(draft));
      state.entry = draft.entry;
      state.revisions = draft.revisions;
      return result;
    },
  };
  return { prisma, state, failure };
}

describe('PatientQuestionnaireEntryStorage.update', () => {
  let harness: ReturnType<typeof buildPrisma>;
  let storage: PatientQuestionnaireEntryStorage;

  beforeEach(() => {
    harness = buildPrisma();
    storage = new PatientQuestionnaireEntryStorage(harness.prisma as never);
  });

  it('corregir dos veces deja dos revisiones con las respuestas de cada momento', async () => {
    const firstAt = new Date('2026-11-01T17:00:00.000Z');
    const secondAt = new Date('2026-11-01T18:00:00.000Z');

    await storage.update(ENTRY, TENANT, {
      answers: { sueno: 8 } as never,
      updatedAt: firstAt,
      updatedByUuid: 'user-1',
    });
    const saved = await storage.update(ENTRY, TENANT, {
      answers: { sueno: 9 } as never,
      updatedAt: secondAt,
      updatedByUuid: 'user-2',
    });

    expect(harness.state.revisions).toEqual([
      {
        entryUuid: ENTRY,
        tenantUuid: TENANT,
        answers: { sueno: 7 },
        revisedAt: firstAt,
        revisedByUuid: 'user-1',
      },
      {
        entryUuid: ENTRY,
        tenantUuid: TENANT,
        answers: { sueno: 8 },
        revisedAt: secondAt,
        revisedByUuid: 'user-2',
      },
    ]);
    expect(saved.answers).toEqual({ sueno: 9 });
  });

  it('si el update falla no queda ninguna revisión suelta', async () => {
    harness.failure.onUpdate = true;

    await expect(
      storage.update(ENTRY, TENANT, {
        answers: { sueno: 8 } as never,
        updatedAt: new Date('2026-11-01T17:00:00.000Z'),
        updatedByUuid: 'user-1',
      }),
    ).rejects.toThrow('fallo al actualizar');

    expect(harness.state.revisions).toHaveLength(0);
    expect(harness.state.entry.answers).toEqual({ sueno: 7 });
  });
});
