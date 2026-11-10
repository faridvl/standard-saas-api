import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  CreatePatientAudiometryEntrySchema,
  InvalidatePatientAudiometryEntrySchema,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { CreatePatientAudiometryEntryUseCase } from './create-patient-audiometry-entry.use-case';
import { FindAudiometryTypesUseCase } from './find-audiometry-types.use-case';
import { FindPatientAudiometryEntriesUseCase } from './find-patient-audiometry-entries.use-case';
import { FindPatientAudiometryEntryUseCase } from './find-patient-audiometry-entry.use-case';
import { InvalidatePatientAudiometryEntryUseCase } from './invalidate-patient-audiometry-entry.use-case';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const OTHER_PATIENT = 'patient-2';
const ENTRY = 'entry-1';
const AUTHOR = 'user-author';
const REVIEWER = 'user-reviewer';

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    marks: {
      AIR: {
        RIGHT: { '500': { thresholdDb: 20, isMasked: false, hasNoResponse: false } },
        LEFT: { '500': { thresholdDb: 35, isMasked: true, hasNoResponse: false } },
      },
      BONE: { RIGHT: {}, LEFT: {} },
      UCL: { RIGHT: {}, LEFT: {} },
      MCL: { RIGHT: {}, LEFT: {} },
      FREE_FIELD: { RIGHT: {}, LEFT: {} },
    },
    weber: { '500': 'CENTER' },
    speech: {
      marks: { RIGHT: { '40': 80 }, LEFT: { '50': 60 } },
      wordListType: 'BISYLLABLE',
      wordListId: 'A1',
      presentedWords: 10,
    },
    summary: {
      ptaType: 'PTA_512',
      gradingScale: 'ASHA',
      ears: {
        RIGHT: {
          pta: 20,
          grade: 'NORMAL',
          speechThresholdDb: 25,
          maxDiscriminationPercent: 96,
          failedWords: 1,
        },
        LEFT: {
          pta: 35,
          grade: 'MILD',
          speechThresholdDb: 35,
          maxDiscriminationPercent: 84,
          failedWords: 4,
        },
      },
    },
    notes: { diagnosis: 'Hipoacusia leve izquierda', observations: '' },
    ...overrides,
  };
}

function buildBody(payloadOverrides: Record<string, unknown> = {}, extra = {}) {
  return { schemaVersion: 1, payload: buildPayload(payloadOverrides), ...extra };
}

function buildScreeningPayload(overrides: Record<string, unknown> = {}) {
  return {
    marks: {
      AIR: {
        RIGHT: { '1000': { thresholdDb: 20, isMasked: false, hasNoResponse: false } },
        LEFT: { '1000': { thresholdDb: 25, isMasked: false, hasNoResponse: false } },
      },
    },
    result: 'PASS',
    notes: { observations: 'Sin hallazgos' },
    ...overrides,
  };
}

function buildScreeningBody(payloadOverrides: Record<string, unknown> = {}) {
  return {
    typeCode: 'SCREENING',
    schemaVersion: 1,
    payload: buildScreeningPayload(payloadOverrides),
  };
}

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    uuid: ENTRY,
    patientUuid: PATIENT,
    schemaVersion: 1,
    typeCode: 'CLINICAL',
    typeName: 'Clínica',
    payload: buildPayload(),
    createdAt: '2026-11-01T16:00:00.000Z',
    createdByUuid: AUTHOR,
    invalidatedAt: null as string | null,
    invalidatedByUuid: null as string | null,
    invalidationReason: null as string | null,
    ...overrides,
  };
}

describe('validación del payload de audiometría', () => {
  const parse = (body: unknown) => CreatePatientAudiometryEntrySchema.safeParse(body);

  it('acepta un payload completo y normaliza las notas', () => {
    const result = CreatePatientAudiometryEntrySchema.parse(
      buildBody({ notes: { diagnosis: '  Normal  ', observations: '' } }),
    );
    if (result.typeCode !== 'CLINICAL') throw new Error('se esperaba una audiometría clínica');
    expect(result.payload.notes.diagnosis).toBe('Normal');
  });

  it('sin typeCode el body se trata como clínico', () => {
    const result = CreatePatientAudiometryEntrySchema.parse(buildBody());
    expect(result.typeCode).toBe('CLINICAL');
  });

  it('acepta Weber sin respuesta (NO_RESPONSE) y sigue aceptando los valores anteriores', () => {
    const body = buildBody({ weber: { '500': 'NO_RESPONSE', '1000': 'LEFT', '2000': 'CENTER' } });
    const result = CreatePatientAudiometryEntrySchema.parse(body);
    if (result.typeCode !== 'CLINICAL') throw new Error('se esperaba una audiometría clínica');
    expect(result.payload.weber).toEqual({
      '500': 'NO_RESPONSE',
      '1000': 'LEFT',
      '2000': 'CENTER',
    });
    expect(parse(buildBody({ weber: { '500': 'NR' } })).success).toBe(false);
  });

  it('el equipo es opcional en el cuerpo y debe ser un uuid', () => {
    const equipmentUuid = '7b0f2a52-3c1e-4a0e-9d57-0c1f5a6a8b11';
    expect(parse({ ...buildBody(), equipmentUuid }).success).toBe(true);
    expect(parse({ ...buildScreeningBody(), equipmentUuid }).success).toBe(true);
    expect(parse({ ...buildBody(), equipmentUuid: 'no-es-uuid' }).success).toBe(false);
  });

  it('acepta weber ausente y lo deja vacío', () => {
    const body = buildBody();
    delete (body.payload as Record<string, unknown>).weber;
    const result = CreatePatientAudiometryEntrySchema.parse(body);
    if (result.typeCode !== 'CLINICAL') throw new Error('se esperaba una audiometría clínica');
    expect(result.payload.weber).toEqual({});
  });

  it('rechaza un oído desconocido', () => {
    const marks = buildPayload().marks;
    (marks.AIR as Record<string, unknown>).CENTER = {};
    expect(parse(buildBody({ marks })).success).toBe(false);
    const speech = { ...buildPayload().speech, marks: { RIGHT: {}, LEFT: {}, MIDDLE: {} } };
    expect(parse(buildBody({ speech })).success).toBe(false);
  });

  it('rechaza una frecuencia fuera de las audiométricas', () => {
    const marks = buildPayload().marks;
    (marks.AIR.RIGHT as Record<string, unknown>)['777'] = {
      thresholdDb: 20,
      isMasked: false,
      hasNoResponse: false,
    };
    expect(parse(buildBody({ marks })).success).toBe(false);
  });

  it('rechaza dB fuera de rango en las marcas tonales', () => {
    const marks = buildPayload().marks;
    marks.AIR.RIGHT = { '500': { thresholdDb: 130, isMasked: false, hasNoResponse: false } };
    expect(parse(buildBody({ marks })).success).toBe(false);
    marks.AIR.RIGHT = { '500': { thresholdDb: -20, isMasked: false, hasNoResponse: false } };
    expect(parse(buildBody({ marks })).success).toBe(false);
  });

  it('rechaza dB o porcentaje fuera de rango en logoaudiometría', () => {
    const speech = buildPayload().speech;
    expect(
      parse(buildBody({ speech: { ...speech, marks: { RIGHT: { '120': 50 }, LEFT: {} } } }))
        .success,
    ).toBe(false);
    expect(
      parse(buildBody({ speech: { ...speech, marks: { RIGHT: { '40': 150 }, LEFT: {} } } }))
        .success,
    ).toBe(false);
  });

  it('rechaza palabras falladas mayores que las presentadas', () => {
    const summary = buildPayload().summary;
    summary.ears.RIGHT.failedWords = 11;
    expect(parse(buildBody({ summary })).success).toBe(false);
  });

  it('exige que las palabras presentadas correspondan al tipo de lista', () => {
    const speech = buildPayload().speech;
    expect(parse(buildBody({ speech: { ...speech, presentedWords: 25 } })).success).toBe(false);
    expect(
      parse(buildBody({ speech: { ...speech, wordListType: 'MONOSYLLABLE', wordListId: 'A' } }))
        .success,
    ).toBe(false); // monosílabos son 25, no 10
    expect(
      parse(
        buildBody({
          speech: { ...speech, wordListType: 'MONOSYLLABLE', wordListId: 'A', presentedWords: 25 },
        }),
      ).success,
    ).toBe(true);
    // Con el panel de palabras oculto basta con que sea el número de alguna lista.
    const hidden = { ...speech, wordListType: null, wordListId: null };
    expect(parse(buildBody({ speech: { ...hidden, presentedWords: 25 } })).success).toBe(true);
    expect(parse(buildBody({ speech: { ...hidden, presentedWords: 17 } })).success).toBe(false);
  });

  it('rechaza una herramienta desconocida en marks', () => {
    const marks = { ...buildPayload().marks, SOUND_FIELD: { RIGHT: {}, LEFT: {} } };
    expect(parse(buildBody({ marks })).success).toBe(false);
  });

  it('solo permite enmascarar vía aérea y ósea', () => {
    const mark = { thresholdDb: 80, isMasked: true, hasNoResponse: false };
    const marks = buildPayload().marks;
    marks.UCL.RIGHT = { '500': mark } as never;
    expect(parse(buildBody({ marks })).success).toBe(false);
    marks.UCL.RIGHT = {};
    marks.BONE.RIGHT = { '500': mark } as never;
    expect(parse(buildBody({ marks })).success).toBe(true);
  });

  it('exige un grado que exista en la escala elegida', () => {
    const summary = buildPayload().summary;
    summary.ears.LEFT.grade = 'SLIGHT';
    summary.gradingScale = 'BIAP';
    expect(parse(buildBody({ summary })).success).toBe(false);
    summary.gradingScale = 'ASHA';
    expect(parse(buildBody({ summary })).success).toBe(true);
    summary.ears.LEFT.grade = 'TOTAL_LOSS';
    expect(parse(buildBody({ summary })).success).toBe(false);
    summary.gradingScale = 'BIAP';
    expect(parse(buildBody({ summary })).success).toBe(true);
  });

  it('exige un PTA en pasos de 5 dB', () => {
    const summary = buildPayload().summary;
    summary.ears.RIGHT.pta = 27;
    expect(parse(buildBody({ summary })).success).toBe(false);
    summary.ears.RIGHT.pta = 25;
    expect(parse(buildBody({ summary })).success).toBe(true);
  });

  it('rechaza intensidades con cero a la izquierda o que no son múltiplo de 5', () => {
    const speech = buildPayload().speech;
    const withKeys = (RIGHT: Record<string, number>) => ({
      speech: { ...speech, marks: { RIGHT, LEFT: {} } },
    });
    expect(parse(buildBody(withKeys({ '05': 50 }))).success).toBe(false);
    expect(parse(buildBody(withKeys({ '040': 50 }))).success).toBe(false);
    expect(parse(buildBody(withKeys({ '42': 50 }))).success).toBe(false);
    expect(parse(buildBody(withKeys({ '0': 5, '5': 10, '100': 100 }))).success).toBe(true);
  });

  it('rechaza una lista de palabras que no es del tipo elegido', () => {
    const speech = { ...buildPayload().speech, wordListType: 'MONOSYLLABLE', wordListId: 'A1' };
    expect(parse(buildBody({ speech })).success).toBe(false);
  });

  it('rechaza notas de más de 1000 caracteres y acepta exactamente 1000', () => {
    expect(
      parse(buildBody({ notes: { diagnosis: 'a'.repeat(1001), observations: '' } })).success,
    ).toBe(false);
    expect(
      parse(buildBody({ notes: { diagnosis: '', observations: 'a'.repeat(1000) } })).success,
    ).toBe(true);
  });

  it('rechaza una versión de contrato desconocida', () => {
    expect(parse({ ...buildBody(), schemaVersion: 2 }).success).toBe(false);
  });
});

describe('validación del payload de rastreo', () => {
  const parse = (body: unknown) => CreatePatientAudiometryEntrySchema.safeParse(body);

  it('acepta un rastreo válido', () => {
    const result = parse(buildScreeningBody());
    expect(result.success).toBe(true);
    expect(result.data?.typeCode).toBe('SCREENING');
  });

  it('acepta REFER y sin observaciones', () => {
    expect(
      parse(buildScreeningBody({ result: 'REFER', notes: { observations: '' } })).success,
    ).toBe(true);
  });

  it('exige el resultado', () => {
    const payload = buildScreeningPayload();
    delete (payload as Record<string, unknown>).result;
    expect(parse({ typeCode: 'SCREENING', schemaVersion: 1, payload }).success).toBe(false);
    expect(parse(buildScreeningBody({ result: 'MAYBE' })).success).toBe(false);
  });

  it('rechaza una marca enmascarada', () => {
    const marks = {
      AIR: {
        RIGHT: { '1000': { thresholdDb: 20, isMasked: true, hasNoResponse: false } },
        LEFT: {},
      },
    };
    expect(parse(buildScreeningBody({ marks })).success).toBe(false);
  });

  it('rechaza herramientas que no son vía aérea', () => {
    const marks = { ...buildScreeningPayload().marks, BONE: { RIGHT: {}, LEFT: {} } };
    expect(parse(buildScreeningBody({ marks })).success).toBe(false);
  });

  it('rechaza un typeCode desconocido', () => {
    expect(parse({ ...buildBody(), typeCode: 'OTRO' }).success).toBe(false);
  });

  it('un rastreo no acepta el payload clínico', () => {
    expect(parse({ ...buildBody(), typeCode: 'SCREENING' }).success).toBe(false);
  });
});

describe('validación del motivo de audiometría mal hecha', () => {
  const parse = (body: unknown) => InvalidatePatientAudiometryEntrySchema.safeParse(body);

  it('recorta el motivo', () => {
    expect(parse({ reason: '  Mal colocado  ' })).toMatchObject({
      success: true,
      data: { reason: 'Mal colocado' },
    });
  });

  it('rechaza motivo ausente, vacío o solo espacios', () => {
    expect(parse({}).success).toBe(false);
    expect(parse({ reason: '' }).success).toBe(false);
    expect(parse({ reason: '   \n ' }).success).toBe(false);
  });

  it('acepta 500 caracteres y rechaza 501', () => {
    expect(parse({ reason: 'a'.repeat(500) }).success).toBe(true);
    expect(parse({ reason: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('guardado de audiometrías', () => {
  let records: ReturnType<typeof buildRecord>[];
  let created: Record<string, unknown>[];
  let invalidateCalls: Record<string, unknown>[];
  let storage: Record<string, unknown>;
  let activeTypes: string[];
  let typeStorage: Record<string, unknown>;
  let getOrCreateUser: { execute: (uuid: string) => Promise<string | null> };
  let equipmentRows: {
    uuid: string;
    tenantUuid: string;
    brand: string;
    model: string;
    isActive: boolean;
  }[];
  let equipmentStorage: Record<string, unknown>;

  beforeEach(() => {
    equipmentRows = [];
    equipmentStorage = {
      findAll: (tenantUuid: string) =>
        Promise.resolve(equipmentRows.filter((e) => e.tenantUuid === tenantUuid)),
      findByUuid: (tenantUuid: string, uuid: string) =>
        Promise.resolve(
          equipmentRows.find((e) => e.uuid === uuid && e.tenantUuid === tenantUuid) ?? null,
        ),
    };
    records = [];
    created = [];
    invalidateCalls = [];
    activeTypes = ['CLINICAL', 'SCREENING'];
    typeStorage = {
      isActive: (code: string) => Promise.resolve(activeTypes.includes(code)),
      findActive: () =>
        Promise.resolve(
          [
            { code: 'CLINICAL', name: 'Clínica' },
            { code: 'SCREENING', name: 'Rastreo' },
          ].filter((t) => activeTypes.includes(t.code)),
        ),
    };
    storage = {
      patientExists: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve([PATIENT, OTHER_PATIENT].includes(patientUuid) && tenantUuid === TENANT),
      findAllByPatient: (patientUuid: string, tenantUuid: string) =>
        Promise.resolve(
          records
            .filter((r) => r.patientUuid === patientUuid && tenantUuid === TENANT)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((r) => ({
              uuid: r.uuid,
              typeCode: r.typeCode,
              typeName: r.typeName,
              screeningResult: null,
              createdAt: r.createdAt,
              createdByUuid: r.createdByUuid,
              invalidatedAt: r.invalidatedAt,
              invalidatedByUuid: r.invalidatedByUuid,
              invalidationReason: r.invalidationReason,
              ptaType: 'PTA_512',
              gradingScale: 'ASHA',
              ptaRight: 20,
              ptaLeft: 35,
            })),
        ),
      findByUuid: (entryUuid: string, patientUuid: string, tenantUuid: string) =>
        Promise.resolve(
          tenantUuid === TENANT
            ? (records.find((r) => r.uuid === entryUuid && r.patientUuid === patientUuid) ?? null)
            : null,
        ),
      invalidate: (
        entryUuid: string,
        patientUuid: string,
        tenantUuid: string,
        actorUuid: string,
        reason: string,
      ) => {
        const record = records.find(
          (r) =>
            r.uuid === entryUuid &&
            r.patientUuid === patientUuid &&
            tenantUuid === TENANT &&
            r.invalidatedAt === null,
        );
        if (!record) return Promise.resolve(false);
        invalidateCalls.push({ entryUuid, patientUuid, tenantUuid, actorUuid, reason });
        record.invalidatedAt = '2026-11-08T18:00:00.000Z';
        record.invalidatedByUuid = actorUuid;
        record.invalidationReason = reason;
        return Promise.resolve(true);
      },
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(buildRecord({ ...data, uuid: 'entry-new' }));
      },
    };
    const names: Record<string, string> = { [AUTHOR]: 'Dra. Ana', [REVIEWER]: 'Dr. Luis' };
    getOrCreateUser = { execute: (uuid: string) => Promise.resolve(names[uuid] ?? null) };
  });

  describe('crear', () => {
    const build = () =>
      new CreatePatientAudiometryEntryUseCase(
        storage as never,
        typeStorage as never,
        getOrCreateUser as never,
        equipmentStorage as never,
      );
    const dto = () => CreatePatientAudiometryEntrySchema.parse(buildBody());
    const EQUIPMENT = '7b0f2a52-3c1e-4a0e-9d57-0c1f5a6a8b11';
    const withEquipment = (equipmentUuid?: string) =>
      CreatePatientAudiometryEntrySchema.parse({ ...buildBody(), equipmentUuid });
    const addEquipment = (overrides: Partial<(typeof equipmentRows)[number]> = {}) =>
      equipmentRows.push({
        uuid: EQUIPMENT,
        tenantUuid: TENANT,
        brand: 'Interacoustics',
        model: 'AD629',
        isActive: true,
        ...overrides,
      });

    it('sin equipos en la clínica el equipo es opcional y se guarda sin él', async () => {
      await build().execute(PATIENT, TENANT, AUTHOR, dto());
      expect(created[0]).toMatchObject({
        equipmentUuid: null,
        equipmentBrand: null,
        equipmentModel: null,
      });
    });

    it('con al menos un equipo activo, omitirlo da 400 y no guarda nada', async () => {
      addEquipment();
      await expect(build().execute(PATIENT, TENANT, AUTHOR, dto())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(created).toHaveLength(0);
    });

    it('con solo equipos inactivos el equipo sigue siendo opcional', async () => {
      addEquipment({ isActive: false });
      await build().execute(PATIENT, TENANT, AUTHOR, dto());
      expect(created).toHaveLength(1);
    });

    it('guarda el equipo con copia de marca y modelo, también en un rastreo', async () => {
      addEquipment();
      await build().execute(PATIENT, TENANT, AUTHOR, withEquipment(EQUIPMENT));
      expect(created[0]).toMatchObject({
        equipmentUuid: EQUIPMENT,
        equipmentBrand: 'Interacoustics',
        equipmentModel: 'AD629',
      });

      const screening = CreatePatientAudiometryEntrySchema.parse({
        ...buildScreeningBody(),
        equipmentUuid: EQUIPMENT,
      });
      await build().execute(PATIENT, TENANT, AUTHOR, screening);
      expect(created[1]).toMatchObject({ equipmentUuid: EQUIPMENT, equipmentModel: 'AD629' });
    });

    it('un equipo de otra clínica da 404 y no guarda nada', async () => {
      addEquipment({ tenantUuid: 'otra-clinica' });
      await expect(
        build().execute(PATIENT, TENANT, AUTHOR, withEquipment(EQUIPMENT)),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(created).toHaveLength(0);
    });

    it('un equipo inexistente da 404', async () => {
      await expect(
        build().execute(PATIENT, TENANT, AUTHOR, withEquipment(EQUIPMENT)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('un equipo desactivado da 400 aunque la clínica tenga otros activos', async () => {
      addEquipment({ isActive: false });
      equipmentRows.push({
        uuid: 'otro',
        tenantUuid: TENANT,
        brand: 'GSI',
        model: 'Pro',
        isActive: true,
      });
      await expect(
        build().execute(PATIENT, TENANT, AUTHOR, withEquipment(EQUIPMENT)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(created).toHaveLength(0);
    });

    it('guarda con el autor del JWT y devuelve su nombre', async () => {
      const result = await build().execute(PATIENT, TENANT, AUTHOR, dto());
      expect(created[0]).toMatchObject({
        tenantUuid: TENANT,
        patientUuid: PATIENT,
        createdByUuid: AUTHOR,
        schemaVersion: 1,
        typeCode: 'CLINICAL',
      });
      expect(result).toMatchObject({
        uuid: 'entry-new',
        typeCode: 'CLINICAL',
        typeName: 'Clínica',
        createdByName: 'Dra. Ana',
      });
    });

    it('guarda un rastreo con su tipo y su payload', async () => {
      const screening = CreatePatientAudiometryEntrySchema.parse(buildScreeningBody());
      await build().execute(PATIENT, TENANT, AUTHOR, screening);
      expect(created[0]).toMatchObject({
        typeCode: 'SCREENING',
        payload: { result: 'PASS' },
      });
    });

    it('un tipo inactivo da 400 y no guarda nada', async () => {
      activeTypes = ['CLINICAL'];
      const screening = CreatePatientAudiometryEntrySchema.parse(buildScreeningBody());
      await expect(build().execute(PATIENT, TENANT, AUTHOR, screening)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(created).toHaveLength(0);
    });

    it('ignora un autor mandado en el body', async () => {
      const body = { ...buildBody(), createdByUuid: 'intruso' };
      await build().execute(
        PATIENT,
        TENANT,
        AUTHOR,
        CreatePatientAudiometryEntrySchema.parse(body),
      );
      expect(created[0].createdByUuid).toBe(AUTHOR);
    });

    it('paciente de otro negocio da 404 y no guarda nada', async () => {
      await expect(build().execute(PATIENT, 'otro-tenant', AUTHOR, dto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(created).toHaveLength(0);
    });
  });

  describe('tipos', () => {
    it('lista los activos como code y name', async () => {
      activeTypes = ['CLINICAL', 'SCREENING'];
      const result = await new FindAudiometryTypesUseCase(typeStorage as never).execute();
      expect(result).toEqual([
        { code: 'CLINICAL', name: 'Clínica' },
        { code: 'SCREENING', name: 'Rastreo' },
      ]);
    });

    it('omite los desactivados', async () => {
      activeTypes = ['CLINICAL'];
      const result = await new FindAudiometryTypesUseCase(typeStorage as never).execute();
      expect(result).toEqual([{ code: 'CLINICAL', name: 'Clínica' }]);
    });
  });

  describe('listar', () => {
    const build = () =>
      new FindPatientAudiometryEntriesUseCase(storage as never, getOrCreateUser as never);

    it('devuelve lo más reciente primero, con autor y PTA, sin payload', async () => {
      records = [
        buildRecord({ uuid: 'viejo', createdAt: '2026-10-01T16:00:00.000Z' }),
        buildRecord({ uuid: 'nuevo', createdAt: '2026-11-01T16:00:00.000Z' }),
      ];
      const result = await build().execute(PATIENT, TENANT);
      expect(result.map((r) => r.uuid)).toEqual(['nuevo', 'viejo']);
      expect(result[0]).toMatchObject({
        createdByName: 'Dra. Ana',
        typeCode: 'CLINICAL',
        typeName: 'Clínica',
        screeningResult: null,
        ptaType: 'PTA_512',
        gradingScale: 'ASHA',
        ptaRight: 20,
        ptaLeft: 35,
      });
      expect(result[0]).not.toHaveProperty('payload');
    });

    it('consulta a identity una sola vez por autor', async () => {
      records = [
        buildRecord({ uuid: 'a' }),
        buildRecord({ uuid: 'b' }),
        buildRecord({ uuid: 'c' }),
      ];
      const lookups: string[] = [];
      getOrCreateUser = {
        execute: (uuid: string) => {
          lookups.push(uuid);
          return Promise.resolve(uuid);
        },
      };
      await build().execute(PATIENT, TENANT);
      expect(lookups).toEqual([AUTHOR]);
    });

    it('devuelve la marca de mal hecha con el nombre de quien la puso', async () => {
      records = [
        buildRecord({
          uuid: 'marcada',
          invalidatedAt: '2026-11-02T10:00:00.000Z',
          invalidatedByUuid: REVIEWER,
          invalidationReason: 'Oído cambiado',
        }),
        buildRecord({ uuid: 'vigente', createdAt: '2026-10-01T16:00:00.000Z' }),
      ];
      const result = await build().execute(PATIENT, TENANT);
      expect(result[0]).toMatchObject({
        uuid: 'marcada',
        invalidatedAt: '2026-11-02T10:00:00.000Z',
        invalidatedByUuid: REVIEWER,
        invalidatedByName: 'Dr. Luis',
        invalidationReason: 'Oído cambiado',
      });
      expect(result[1]).toMatchObject({
        invalidatedAt: null,
        invalidatedByUuid: null,
        invalidatedByName: null,
        invalidationReason: null,
      });
    });

    it('otra clínica da 404', async () => {
      await expect(build().execute(PATIENT, 'otro-tenant')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('marcar como mal hecha', () => {
    const build = () =>
      new InvalidatePatientAudiometryEntryUseCase(
        storage as never,
        new FindPatientAudiometryEntryUseCase(storage as never, getOrCreateUser as never),
      );

    it('marca con el usuario del JWT, devuelve la marca y no toca el payload', async () => {
      records = [buildRecord()];
      const payloadBefore = JSON.stringify(records[0].payload);
      const result = await build().execute(PATIENT, ENTRY, TENANT, REVIEWER, 'Oído cambiado');
      expect(invalidateCalls).toEqual([
        {
          entryUuid: ENTRY,
          patientUuid: PATIENT,
          tenantUuid: TENANT,
          actorUuid: REVIEWER,
          reason: 'Oído cambiado',
        },
      ]);
      expect(result).toMatchObject({
        uuid: ENTRY,
        createdByName: 'Dra. Ana',
        invalidatedAt: '2026-11-08T18:00:00.000Z',
        invalidatedByUuid: REVIEWER,
        invalidatedByName: 'Dr. Luis',
        invalidationReason: 'Oído cambiado',
      });
      expect(JSON.stringify(result.payload)).toBe(payloadBefore);
    });

    it('una ya marcada da 409 y conserva la primera marca', async () => {
      records = [
        buildRecord({
          invalidatedAt: '2026-11-02T10:00:00.000Z',
          invalidatedByUuid: AUTHOR,
          invalidationReason: 'Primera',
        }),
      ];
      await expect(
        build().execute(PATIENT, ENTRY, TENANT, REVIEWER, 'Segunda'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(invalidateCalls).toHaveLength(0);
      expect(records[0].invalidationReason).toBe('Primera');
    });

    it('si otra marca se adelanta entre la lectura y la escritura da 409', async () => {
      records = [buildRecord()];
      storage.invalidate = () => Promise.resolve(false);
      await expect(
        build().execute(PATIENT, ENTRY, TENANT, REVIEWER, 'Motivo'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('otra clínica da 404 y no marca nada', async () => {
      records = [buildRecord()];
      await expect(
        build().execute(PATIENT, ENTRY, 'otro-tenant', REVIEWER, 'Motivo'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(invalidateCalls).toHaveLength(0);
    });

    it('un registro de otro paciente da 404 y no marca nada', async () => {
      records = [buildRecord()];
      await expect(
        build().execute(OTHER_PATIENT, ENTRY, TENANT, REVIEWER, 'Motivo'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(invalidateCalls).toHaveLength(0);
    });
  });

  describe('traer por uuid', () => {
    const build = () =>
      new FindPatientAudiometryEntryUseCase(storage as never, getOrCreateUser as never);

    it('devuelve la entidad completa con el nombre del autor', async () => {
      records = [buildRecord()];
      const result = await build().execute(PATIENT, ENTRY, TENANT);
      expect(result).toMatchObject({ uuid: ENTRY, createdByName: 'Dra. Ana' });
      if (result.typeCode !== 'CLINICAL') throw new Error('se esperaba una audiometría clínica');
      expect(result.payload.summary.ears.RIGHT.pta).toBe(20);
    });

    it('otra clínica da 404', async () => {
      records = [buildRecord()];
      await expect(build().execute(PATIENT, ENTRY, 'otro-tenant')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('un registro de otro paciente da 404', async () => {
      records = [buildRecord()];
      await expect(build().execute(OTHER_PATIENT, ENTRY, TENANT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
