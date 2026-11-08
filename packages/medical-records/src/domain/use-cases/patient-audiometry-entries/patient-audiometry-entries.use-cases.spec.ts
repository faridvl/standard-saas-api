import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@project/core';
import {
  CreatePatientAudiometryEntrySchema,
  InvalidatePatientAudiometryEntrySchema,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { PatientAudiometryEntryController } from '@medical-records/app/controllers/patient-audiometry-entry.controller';
import { CreatePatientAudiometryEntryUseCase } from './create-patient-audiometry-entry.use-case';
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

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    uuid: ENTRY,
    patientUuid: PATIENT,
    schemaVersion: 1,
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
    expect(result.payload.notes.diagnosis).toBe('Normal');
  });

  it('acepta weber ausente y lo deja vacío', () => {
    const body = buildBody();
    delete (body.payload as Record<string, unknown>).weber;
    expect(CreatePatientAudiometryEntrySchema.parse(body).payload.weber).toEqual({});
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
  let getOrCreateUser: { execute: (uuid: string) => Promise<string | null> };

  beforeEach(() => {
    records = [];
    created = [];
    invalidateCalls = [];
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
      new CreatePatientAudiometryEntryUseCase(storage as never, getOrCreateUser as never);
    const dto = () => CreatePatientAudiometryEntrySchema.parse(buildBody());

    it('guarda con el autor del JWT y devuelve su nombre', async () => {
      const result = await build().execute(PATIENT, TENANT, AUTHOR, dto());
      expect(created[0]).toMatchObject({
        tenantUuid: TENANT,
        patientUuid: PATIENT,
        createdByUuid: AUTHOR,
        schemaVersion: 1,
      });
      expect(result).toMatchObject({ uuid: 'entry-new', createdByName: 'Dra. Ana' });
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

describe('permisos del controlador de audiometrías', () => {
  const guard = new RolesGuard(new Reflector());
  const contextFor = (role: string): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      getClass: () => PatientAudiometryEntryController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;

  it.each(['OWNER', 'ADMIN', 'DOCTOR'])('%s puede entrar', (role) => {
    expect(guard.canActivate(contextFor(role))).toBe(true);
  });

  it('STAFF recibe 403', () => {
    expect(() => guard.canActivate(contextFor('STAFF'))).toThrow(ForbiddenException);
  });
});
