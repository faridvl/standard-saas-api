import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@project/core';
import { CreatePatientAudiometryEntrySchema } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { PatientAudiometryEntryController } from '@medical-records/app/controllers/patient-audiometry-entry.controller';
import { CreatePatientAudiometryEntryUseCase } from './create-patient-audiometry-entry.use-case';
import { FindPatientAudiometryEntriesUseCase } from './find-patient-audiometry-entries.use-case';
import { FindPatientAudiometryEntryUseCase } from './find-patient-audiometry-entry.use-case';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const OTHER_PATIENT = 'patient-2';
const ENTRY = 'entry-1';
const AUTHOR = 'user-author';

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
      presentedWords: 25,
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
    summary.ears.RIGHT.failedWords = 26;
    expect(parse(buildBody({ summary })).success).toBe(false);

    const speech = { ...buildPayload().speech, presentedWords: 3 };
    expect(parse(buildBody({ speech })).success).toBe(false); // LEFT tiene 4 falladas
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

describe('guardado de audiometrías', () => {
  let records: ReturnType<typeof buildRecord>[];
  let created: Record<string, unknown>[];
  let storage: Record<string, unknown>;
  let getOrCreateUser: { execute: (uuid: string) => Promise<string | null> };

  beforeEach(() => {
    records = [];
    created = [];
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
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(buildRecord({ ...data, uuid: 'entry-new' }));
      },
    };
    const names: Record<string, string> = { [AUTHOR]: 'Dra. Ana' };
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
      expect(result[0]).toMatchObject({ createdByName: 'Dra. Ana', ptaRight: 20, ptaLeft: 35 });
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

    it('otra clínica da 404', async () => {
      await expect(build().execute(PATIENT, 'otro-tenant')).rejects.toBeInstanceOf(
        NotFoundException,
      );
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
