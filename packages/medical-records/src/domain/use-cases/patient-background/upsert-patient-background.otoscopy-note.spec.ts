import { describe, it, expect } from '@jest/globals';
import { UpsertPatientBackgroundUseCase } from './upsert-patient-background.use-case';
import { UpsertPatientPhysicalExamUseCase } from '@medical-records/domain/use-cases/patient-physical-exam/upsert-patient-physical-exam.use-case';
import { PatientPhysicalExamStorage } from '@medical-records/infrastructure/adapters/patientPhysicalExamRepository/patient-physical-exam.storage';

// Los dos caminos que guardan otoscopia fuera del historial (PUT /physical-exam y PUT /background con
// otoscopyRight/Left) pasan por el mismo storage: cada uno deja su nota de Pruebas.
describe('otoscopia por exploración física y antecedentes: nota en Control de evolución', () => {
  const build = () => {
    const notes: Record<string, unknown>[] = [];
    const entries: Record<string, unknown>[] = [];
    const prisma = {
      patient: { findFirst: () => Promise.resolve({ id: 1 }) },
      patientPhysicalExam: {
        findUnique: () => Promise.resolve(null),
        upsert: ({ create }: { create: Record<string, unknown> }) =>
          Promise.resolve({
            uuid: 'x',
            createdAt: new Date(),
            updatedAt: new Date(),
            otoscopyRight: null,
            otoscopyLeft: null,
            ...create,
          }),
      },
      patientOtoscopyEntry: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          entries.push(data);
          return Promise.resolve(data);
        },
      },
      patientNote: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          notes.push(data);
          return Promise.resolve(data);
        },
      },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    };
    const physicalExamStorage = new PatientPhysicalExamStorage(prisma as never);
    const activity = { execute: () => Promise.resolve() };
    const physicalExam = new UpsertPatientPhysicalExamUseCase(
      physicalExamStorage,
      activity as never,
    );
    const backgroundStorage = {
      patientExists: () => Promise.resolve(true),
      findByPatient: () => Promise.resolve(null),
      upsert: () => Promise.resolve({}),
    };
    const background = new UpsertPatientBackgroundUseCase(
      backgroundStorage as never,
      activity as never,
      physicalExam,
    );
    return { physicalExam, background, notes, entries };
  };

  it('PUT exploración física crea la nota con la misma fecha que la entrada', async () => {
    const { physicalExam, notes, entries } = build();

    await physicalExam.execute('p1', 't1', 'u1', { otoscopyRight: 'Limpio', otoscopyLeft: ' ' });

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      category: 'EXTERNAL_TEST',
      authorUuid: 'u1',
      text: 'Otoscopia\nOD: Limpio',
    });
    expect(notes[0].createdAt).toBe(entries[0].createdAt);
  });

  it('PUT antecedentes con otoscopia crea la nota', async () => {
    const { background, notes } = build();

    await background.execute('p1', 't1', 'u1', {
      answers: { otoscopyLeft: 'Cerumen' },
    } as never);

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ text: 'Otoscopia\nOI: Cerumen', tenantUuid: 't1' });
  });

  it('con ambos oídos vacíos no se crea entrada ni nota', async () => {
    const { physicalExam, notes, entries } = build();

    await physicalExam.execute('p1', 't1', 'u1', { otoscopyRight: ' ', otoscopyLeft: null });

    expect(entries).toHaveLength(0);
    expect(notes).toHaveLength(0);
  });
});
