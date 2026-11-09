import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PatientAudiometryEntryStorage } from './patient-audiometry-entry.storage';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';

describe('PatientAudiometryEntryStorage', () => {
  const findFirst = jest.fn<() => Promise<unknown>>();
  const updateMany = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();
  const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const storage = new PatientAudiometryEntryStorage({
    patientAudiometryEntry: { findFirst, updateMany },
    $queryRaw: queryRaw,
  } as never);

  beforeEach(() => {
    findFirst.mockReset();
    updateMany.mockReset();
    queryRaw.mockReset();
  });

  it('findByUuid excluye registros de pacientes borrados y filtra por negocio y paciente', async () => {
    findFirst.mockResolvedValue(null);
    await expect(storage.findByUuid('entry-1', PATIENT, TENANT)).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        uuid: 'entry-1',
        patientUuid: PATIENT,
        tenantUuid: TENANT,
        patient: { deletedAt: null },
      },
      include: { type: { select: { name: true } } },
    });
  });

  it('la lista pasa negocio y paciente como parámetros y devuelve ptaType y escala', async () => {
    queryRaw.mockResolvedValue([
      {
        uuid: 'entry-1',
        typeCode: 'CLINICAL',
        typeName: 'Clínica',
        screeningResult: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        createdByUuid: 'author-1',
        invalidatedAt: new Date('2026-11-02T08:00:00.000Z'),
        invalidatedByUuid: 'reviewer-1',
        invalidationReason: 'Mal colocado',
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: null,
      },
    ]);
    const result = await storage.findAllByPatient(PATIENT, TENANT);

    const [strings, ...values] = queryRaw.mock.calls[0] as [string[], ...unknown[]];
    expect(values).toEqual([TENANT, PATIENT]);
    expect(strings.join('?')).toContain('e."tenantUuid" = ?');
    expect(strings.join('?')).not.toContain('"payload",');
    expect(result).toEqual([
      {
        uuid: 'entry-1',
        typeCode: 'CLINICAL',
        typeName: 'Clínica',
        screeningResult: null,
        createdAt: '2026-11-01T10:00:00.000Z',
        createdByUuid: 'author-1',
        invalidatedAt: '2026-11-02T08:00:00.000Z',
        invalidatedByUuid: 'reviewer-1',
        invalidationReason: 'Mal colocado',
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: null,
      },
    ]);
  });

  it('la lista de un rastreo trae el resultado y deja los PTA en null', async () => {
    queryRaw.mockResolvedValue([
      {
        uuid: 'entry-3',
        typeCode: 'SCREENING',
        typeName: 'Rastreo',
        screeningResult: 'REFER',
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        createdByUuid: 'author-1',
        invalidatedAt: null,
        invalidatedByUuid: null,
        invalidationReason: null,
        ptaType: null,
        gradingScale: null,
        ptaRight: null,
        ptaLeft: null,
      },
    ]);
    const [row] = await storage.findAllByPatient(PATIENT, TENANT);
    expect(row).toMatchObject({
      typeCode: 'SCREENING',
      typeName: 'Rastreo',
      screeningResult: 'REFER',
      ptaType: null,
      gradingScale: null,
      ptaRight: null,
      ptaLeft: null,
    });
  });

  it('findByUuid arma el payload según el tipo guardado', async () => {
    findFirst.mockResolvedValue({
      uuid: 'entry-3',
      patientUuid: PATIENT,
      schemaVersion: 1,
      typeCode: 'SCREENING',
      type: { name: 'Rastreo' },
      payload: { result: 'PASS' },
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
      createdByUuid: 'author-1',
      invalidatedAt: null,
      invalidatedByUuid: null,
      invalidationReason: null,
    });
    await expect(storage.findByUuid('entry-3', PATIENT, TENANT)).resolves.toMatchObject({
      typeCode: 'SCREENING',
      typeName: 'Rastreo',
      payload: { result: 'PASS' },
    });
  });

  it('la lista devuelve la marca en null cuando la fila no está marcada', async () => {
    queryRaw.mockResolvedValue([
      {
        uuid: 'entry-2',
        typeCode: 'CLINICAL',
        typeName: 'Clínica',
        screeningResult: null,
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        createdByUuid: 'author-1',
        invalidatedAt: null,
        invalidatedByUuid: null,
        invalidationReason: null,
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: 30,
      },
    ]);
    const [row] = await storage.findAllByPatient(PATIENT, TENANT);
    expect(row).toMatchObject({
      invalidatedAt: null,
      invalidatedByUuid: null,
      invalidationReason: null,
    });
    const [strings] = queryRaw.mock.calls[0] as [string[]];
    const sql = strings.join('?');
    expect(sql).toContain('"invalidatedAt"');
    expect(sql).toContain('"invalidatedByUuid"');
    expect(sql).toContain('"invalidationReason"');
  });

  it('invalidate filtra por negocio, paciente y solo filas sin marcar, y no toca el payload', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(storage.invalidate('entry-1', PATIENT, TENANT, 'user-1', 'Motivo')).resolves.toBe(
      true,
    );
    const [args] = updateMany.mock.calls[0] as [{ where: unknown; data: Record<string, unknown> }];
    expect(args.where).toEqual({
      uuid: 'entry-1',
      patientUuid: PATIENT,
      tenantUuid: TENANT,
      invalidatedAt: null,
      patient: { deletedAt: null },
    });
    expect(Object.keys(args.data).sort()).toEqual([
      'invalidatedAt',
      'invalidatedByUuid',
      'invalidationReason',
    ]);
    expect(args.data).toMatchObject({ invalidatedByUuid: 'user-1', invalidationReason: 'Motivo' });
    expect(args.data.invalidatedAt).toBeInstanceOf(Date);
  });

  it('invalidate devuelve false si no había fila (otra clínica, otro paciente o ya marcada)', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(storage.invalidate('entry-1', PATIENT, 'otro', 'user-1', 'Motivo')).resolves.toBe(
      false,
    );
  });
});

describe('PatientAudiometryEntryStorage.create', () => {
  function buildCreateStorage(failNote = false) {
    const calls: string[] = [];
    const created: Record<string, unknown>[] = [];
    const notes: Record<string, unknown>[] = [];
    const prisma = {
      patientAudiometryEntry: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          calls.push('create');
          created.push(data);
          return Promise.resolve({ invalidatedAt: null, ...data, type: { name: 'Tipo' } });
        },
      },
      patientNote: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          calls.push('note');
          if (failNote) return Promise.reject(new Error('falla la nota'));
          notes.push(data);
          return Promise.resolve(data);
        },
      },
      $transaction: async (work: Promise<unknown>[]) => {
        try {
          return await Promise.all(work);
        } catch (error) {
          created.length = 0;
          notes.length = 0;
          throw error;
        }
      },
    };
    return { storage: new PatientAudiometryEntryStorage(prisma as never), calls, created, notes };
  }

  const data = {
    tenantUuid: TENANT,
    patientUuid: PATIENT,
    createdByUuid: 'user-1',
    schemaVersion: 1,
    typeCode: 'CLINICAL' as const,
    payload: {} as never,
  };

  it('crea la audiometría y una nota de Pruebas con autor, texto y la misma fecha', async () => {
    const { storage, calls, created, notes } = buildCreateStorage();

    await storage.create(data);

    expect(calls).toEqual(['create', 'note']);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      patientUuid: PATIENT,
      tenantUuid: TENANT,
      authorUuid: 'user-1',
      category: 'EXTERNAL_TEST',
      text: expect.stringMatching(/^Se realizó audiometría clínica el \d{2}\/\d{2}\/\d{4}$/),
    });
    expect(created[0].createdAt).toBeInstanceOf(Date);
    expect(notes[0].createdAt).toBe(created[0].createdAt);
  });

  it('la nota de una audiometría de rastreo lleva el tipo en el texto', async () => {
    const { storage, notes } = buildCreateStorage();

    await storage.create({ ...data, typeCode: 'SCREENING', payload: {} as never });

    expect(notes[0].text).toMatch(/^Se realizó audiometría de rastreo el \d{2}\/\d{2}\/\d{4}$/);
  });

  it('enlaza la nota con la audiometría por su uuid', async () => {
    const { storage, created, notes } = buildCreateStorage();

    const record = await storage.create(data);

    expect(created[0].uuid).toEqual(expect.any(String));
    expect(notes[0].audiometryEntryUuid).toBe(created[0].uuid);
    expect(record.uuid).toBe(created[0].uuid);
  });

  it('si falla la nota, falla todo y no queda la audiometría', async () => {
    const { storage, created } = buildCreateStorage(true);

    await expect(storage.create(data)).rejects.toThrow('falla la nota');
    expect(created).toHaveLength(0);
  });
});
