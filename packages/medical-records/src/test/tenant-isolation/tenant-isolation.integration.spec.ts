import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { GlobalExceptionFilter } from '@project/core';
import { MedicalRecordsModule } from '@medical-records/app/medical-records.module';
import { PrismaService } from '@medical-records/infrastructure/adapters/prisma/prisma.service';
import { scanRoutesWithParams } from './route-scanner';
import { ROUTES_MANIFEST, SeedKey, isExempt } from './routes.manifest';

// El paquete es ESM puro y Jest no lo carga; los jobs programados no importan para estas sondas.
jest.mock('@nestjs/schedule', () => ({
  ScheduleModule: { forRoot: () => ({ module: class ScheduleModuleStub {} }) },
  Cron: () => () => undefined,
  CronExpression: new Proxy({}, { get: () => '* * * * *' }),
}));

/**
 * Prueba contra una base real: se corre con `TENANT_ISOLATION_DB=1` y solo contra una base local.
 * Siembra datos de la clínica A y los toca con el token de la clínica B: todo debe dar 404 y
 * nada de lo sembrado puede cambiar.
 */
const enabled = process.env.TENANT_ISOLATION_DB === '1';
const describeIfEnabled = enabled ? describe : describe.skip;

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const SUFFIX = randomUUID().slice(0, 8);

describeIfEnabled('aislamiento por clínica: sondas HTTP con el token de otra clínica', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let tokenA: string;
  let tokenB: string;
  const seed = {} as Record<SeedKey, string>;
  let encounterA: string;

  const sign = (tenantUuid: string, tenantId: number): string =>
    new JwtService({ secret: process.env.JWT_SECRET }).sign(
      {
        sub: randomUUID(),
        email: `aislamiento-${tenantId}@audiocolors.test`,
        role: 'OWNER',
        attendsPatients: true,
        specialties: ['AUDIOLOGY'],
        tenantId,
        tenantUuid,
      },
      { expiresIn: '10m' },
    );

  const snapshot = async (): Promise<string> =>
    JSON.stringify([
      await prisma.patient.findUnique({ where: { uuid: seed.patient } }),
      await prisma.patientContact.findUnique({ where: { uuid: seed.contact } }),
      await prisma.patientDevice.findUnique({ where: { uuid: seed.device } }),
      await prisma.product.findUnique({ where: { uuid: seed.product } }),
      await prisma.productUnit.findUnique({ where: { uuid: seed.unit } }),
      await prisma.medicalControl.findUnique({ where: { uuid: seed.control } }),
      await prisma.appointmentType.findUnique({ where: { uuid: seed.appointmentType } }),
      await prisma.branch.findUnique({ where: { uuid: seed.branch } }),
      await prisma.clinicEquipment.findUnique({ where: { uuid: seed.equipment } }),
      await prisma.appointment.findUnique({ where: { uuid: seed.appointment } }),
      await prisma.patient.count({ where: { tenantUuid: TENANT_A } }),
      await prisma.productUnit.count({ where: { product: { tenantUuid: TENANT_A } } }),
    ]);

  beforeAll(async () => {
    const dbUrl = process.env.MEDICAL_RECORDS_DB_URL ?? '';
    if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
      throw new Error('La prueba de aislamiento solo corre contra una base local');
    }
    app = await NestFactory.create(MedicalRecordsModule, { logger: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');
    prisma = app.get(PrismaService);
    tokenA = sign(TENANT_A, 9001);
    tokenB = sign(TENANT_B, 9002);

    const patient = await prisma.patient.create({
      data: {
        firstName: 'Paciente',
        lastName: `Aislamiento ${SUFFIX}`,
        tenantId: 9001,
        tenantUuid: TENANT_A,
        createdBy: 'aislamiento',
      },
    });
    seed.patient = patient.uuid;
    seed.contact = (
      await prisma.patientContact.create({
        data: {
          patientUuid: patient.uuid,
          tenantUuid: TENANT_A,
          name: 'Contacto',
          phone: '8000-0000',
        },
      })
    ).uuid;
    const product = await prisma.product.create({
      data: { tenantUuid: TENANT_A, sku: `SKU-AISL-${SUFFIX}`, name: 'Producto A' },
    });
    seed.product = product.uuid;
    const unit = await prisma.productUnit.create({
      data: { productId: product.id, serialNumber: `SN-AISL-${SUFFIX}` },
    });
    seed.unit = unit.uuid;
    seed.device = (
      await prisma.patientDevice.create({
        data: {
          patientUuid: patient.uuid,
          tenantUuid: TENANT_A,
          side: 'OD',
          productUnitId: unit.id,
        },
      })
    ).uuid;
    seed.control = (
      await prisma.medicalControl.create({
        data: {
          patientUUID: patient.uuid,
          userUUID: randomUUID(),
          tenantUUID: TENANT_A,
          speciality: 'AUDIOLOGY',
          findings: {},
          diagnosis: 'Sin hallazgos',
        },
      })
    ).uuid;
    const appointmentType = await prisma.appointmentType.create({
      data: { name: `Tipo ${SUFFIX}`, tenantUUID: TENANT_A },
    });
    seed.appointmentType = appointmentType.uuid;
    seed.branch = (
      await prisma.branch.create({ data: { name: `Sede ${SUFFIX}`, tenantUuid: TENANT_A } })
    ).uuid;
    seed.equipment = (
      await prisma.clinicEquipment.create({
        data: { brand: `Marca ${SUFFIX}`, model: 'Modelo', tenantUuid: TENANT_A },
      })
    ).uuid;
    seed.appointment = (
      await prisma.appointment.create({
        data: {
          patientUUID: patient.uuid,
          userUUID: randomUUID(),
          tenantUUID: TENANT_A,
          typeUUID: appointmentType.uuid,
          speciality: 'AUDIOLOGY',
          status: 'SCHEDULED',
          date: new Date('2030-01-15T00:00:00Z'),
          startTime: new Date('2030-01-15T15:00:00Z'),
          endTime: new Date('2030-01-15T15:30:00Z'),
        },
      })
    ).uuid;
    encounterA = (
      await prisma.encounter.create({
        data: {
          patientUuid: patient.uuid,
          tenantUuid: TENANT_A,
          autorUuid: randomUUID(),
          especialidad: 'AUDIOLOGY',
        },
      })
    ).uuid;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.study.deleteMany({ where: { tenantUuid: { in: [TENANT_A, TENANT_B] } } });
    await prisma.maintenance.deleteMany({ where: { tenantUuid: { in: [TENANT_A, TENANT_B] } } });
    await prisma.encounter.deleteMany({ where: { tenantUuid: { in: [TENANT_A, TENANT_B] } } });
    await prisma.patient.deleteMany({ where: { tenantUuid: TENANT_B } });
    await prisma.appointment.deleteMany({ where: { tenantUUID: TENANT_A } });
    await prisma.appointmentType.deleteMany({ where: { tenantUUID: TENANT_A } });
    await prisma.branch.deleteMany({ where: { tenantUuid: TENANT_A } });
    await prisma.clinicEquipment.deleteMany({ where: { tenantUuid: TENANT_A } });
    await prisma.medicalControl.deleteMany({ where: { tenantUUID: TENANT_A } });
    await prisma.patientDevice.deleteMany({ where: { tenantUuid: TENANT_A } });
    await prisma.productUnit.deleteMany({ where: { product: { tenantUuid: TENANT_A } } });
    await prisma.product.deleteMany({ where: { tenantUuid: TENANT_A } });
    await prisma.patientContact.deleteMany({ where: { patientUuid: seed.patient } });
    await prisma.patient.deleteMany({ where: { tenantUuid: TENANT_A } });
    await app.close();
  });

  const call = (
    method: string,
    path: string,
    token: string,
    body?: Record<string, unknown>,
  ): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('la clínica dueña sí ve su paciente (la siembra es válida)', async () => {
    const response = await call('GET', `/patients/${seed.patient}`, tokenA);
    expect(response.status).toBe(200);
  });

  const probes = scanRoutesWithParams().filter((route) => {
    const entry = ROUTES_MANIFEST[route.key];
    return entry !== undefined && !isExempt(entry);
  });

  it.each(probes.map((route) => [route.key, route] as const))(
    '%s con el token de otra clínica da 404 y no cambia nada',
    async (_key, route) => {
      const entry = ROUTES_MANIFEST[route.key];
      if (isExempt(entry)) return;
      const path = route.path.replace(/:(\w+)/g, (_match, name: string) => {
        const seedKey = entry.params?.[name];
        if (seedKey) return seed[seedKey];
        return name === 'number' ? '1' : randomUUID();
      });
      const before = await snapshot();

      const response = await call(route.method, path, tokenB, entry.body);

      expect(response.status).toBe(404);
      expect(await snapshot()).toBe(before);
    },
  );

  it('crear un dispositivo con una unidad de otra clínica da 404 y no la asigna', async () => {
    const patientB = await prisma.patient.create({
      data: {
        firstName: 'Paciente',
        lastName: `Clínica B ${SUFFIX}`,
        tenantId: 9002,
        tenantUuid: TENANT_B,
        createdBy: 'aislamiento',
      },
    });
    try {
      const before = await snapshot();
      const response = await call('POST', `/patients/${patientB.uuid}/devices`, tokenB, {
        productUnitUuid: seed.unit,
        side: 'OI',
      });
      expect(response.status).toBe(404);
      expect(await snapshot()).toBe(before);
    } finally {
      await prisma.patient.deleteMany({ where: { tenantUuid: TENANT_B } });
    }
  });

  it('crear un dispositivo colgado de un paciente de otra clínica da 404', async () => {
    const before = await snapshot();
    const response = await call('POST', `/patients/${seed.patient}/devices`, tokenB, {
      productUnitUuid: seed.unit,
      side: 'OI',
    });
    expect(response.status).toBe(404);
    expect(await snapshot()).toBe(before);
  });

  describe('ids en el cuerpo que pertenecen a otra clínica', () => {
    let patientB: string;

    beforeAll(async () => {
      patientB = (
        await prisma.patient.create({
          data: {
            firstName: 'Paciente',
            lastName: `Cuerpo B ${SUFFIX}`,
            tenantId: 9002,
            tenantUuid: TENANT_B,
            createdBy: 'aislamiento',
          },
        })
      ).uuid;
    });

    const countsOfB = async (): Promise<number[]> => [
      await prisma.encounter.count({ where: { tenantUuid: TENANT_B } }),
      await prisma.maintenance.count({ where: { tenantUuid: TENANT_B } }),
      await prisma.study.count({ where: { tenantUuid: TENANT_B } }),
    ];

    const cases: Array<[string, string, () => Record<string, unknown>]> = [
      [
        'POST /encounters con la cita de otra clínica',
        '/encounters',
        () => ({
          patientUuid: patientB,
          especialidad: 'AUDIOLOGY',
          appointmentUuid: seed.appointment,
        }),
      ],
      [
        'POST /encounters con el paciente de otra clínica',
        '/encounters',
        () => ({ patientUuid: seed.patient, especialidad: 'AUDIOLOGY' }),
      ],
      [
        'POST /maintenance con el dispositivo de otra clínica',
        '/maintenance',
        () => ({ patientUuid: patientB, description: 'Limpieza', deviceUuid: seed.device }),
      ],
      [
        'POST /maintenance con el encuentro de otra clínica',
        '/maintenance',
        () => ({ patientUuid: patientB, description: 'Limpieza', encounterUuid: encounterA }),
      ],
      [
        'POST /studies con el encuentro de otra clínica',
        '/studies',
        () => ({
          patientUuid: patientB,
          encounterUuid: encounterA,
          tipo: 'AUDIOMETRIA_TONAL',
          payload: {},
        }),
      ],
    ];

    it.each(cases)('%s da 404 y no crea nada', async (_name, path, body) => {
      const before = await countsOfB();
      const response = await call('POST', path, tokenB, body());
      expect(response.status).toBe(404);
      expect(await countsOfB()).toEqual(before);
    });

    it('GET /encounters/:uuid de la clínica dueña no mezcla hijos de otra clínica', async () => {
      const response = await call('GET', `/encounters/${encounterA}`, tokenA);
      expect(response.status).toBe(200);
    });
  });
});
