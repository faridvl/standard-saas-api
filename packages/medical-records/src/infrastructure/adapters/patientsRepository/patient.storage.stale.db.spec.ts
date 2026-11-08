import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PatientStorage } from './patient.storage';

/**
 * Prueba contra una base real de pruebas: se activa con STALE_DB_TESTS=1 y
 * MEDICAL_RECORDS_DB_URL apuntando a la base de pruebas (nunca producción).
 * Crea pacientes en negocios propios y los borra al terminar.
 */
const enabled = process.env.STALE_DB_TESTS === '1' && !!process.env.MEDICAL_RECORDS_DB_URL;
const describeDb = enabled ? describe : describe.skip;

const TENANT = 'stale-test-tenant-a';
const OTHER_TENANT = 'stale-test-tenant-b';
const CUTOFF = new Date('2026-05-08T06:00:00.000Z');
const OLD = new Date('2026-03-01T15:00:00.000Z');

describeDb('PatientStorage.findStaleByTenant contra la base', () => {
  let pool: Pool;
  let prisma: PrismaClient;
  let storage: PatientStorage;

  const createPatient = (firstName: string, tenantUuid: string, createdAt: Date) =>
    prisma.patient.create({
      data: {
        firstName,
        lastName: 'Prueba',
        tenantId: 0,
        tenantUuid,
        createdBy: 'stale-test',
        createdAt,
        updatedAt: createdAt,
      },
    });

  const cleanup = async () => {
    const tenants = [TENANT, OTHER_TENANT];
    await prisma.$executeRaw`DELETE FROM "MedicalControl" WHERE "tenantUUID" = ANY(${tenants})`;
    await prisma.$executeRaw`DELETE FROM "Appointment" WHERE "tenantUUID" = ANY(${tenants})`;
    await prisma.$executeRaw`DELETE FROM "AppointmentType" WHERE "tenantUUID" = ANY(${tenants})`;
    await prisma.$executeRaw`DELETE FROM "PatientNote" WHERE "tenantUuid" = ANY(${tenants})`;
    await prisma.$executeRaw`DELETE FROM "Patient" WHERE "tenantUuid" = ANY(${tenants})`;
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.MEDICAL_RECORDS_DB_URL, max: 1 });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    storage = new PatientStorage(prisma as never);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  });

  it('un control médico reciente, una cita a futuro o una nota de otro negocio se comportan según la regla', async () => {
    const withControl = await createPatient('ConControl', TENANT, OLD);
    const withFutureAppointment = await createPatient('ConCitaFutura', TENANT, OLD);
    await createPatient('SinNada', TENANT, new Date('2026-01-01T15:00:00.000Z'));
    const foreignNote = await createPatient('NotaAjena', TENANT, OLD);

    const type = await prisma.appointmentType.create({
      data: { name: 'Control', tenantUUID: TENANT },
    });
    const appointmentData = (patientUUID: string, startTime: Date) => ({
      patientUUID,
      userUUID: 'stale-test-user',
      tenantUUID: TENANT,
      typeUUID: type.uuid,
      speciality: 'ORL',
      status: 'CONFIRMED',
      date: startTime,
      startTime,
      endTime: startTime,
      createdAt: OLD,
      updatedAt: OLD,
    });
    await prisma.appointment.create({
      data: appointmentData(withFutureAppointment.uuid, new Date('2026-12-01T15:00:00.000Z')),
    });
    await prisma.medicalControl.create({
      data: {
        patientUUID: withControl.uuid,
        userUUID: 'stale-test-user',
        tenantUUID: TENANT,
        speciality: 'ORL',
        findings: {},
        diagnosis: 'x',
        createdAt: new Date('2026-08-10T15:00:00.000Z'),
        updatedAt: new Date('2026-08-10T15:00:00.000Z'),
      },
    });
    await prisma.patientNote.create({
      data: {
        patientUuid: foreignNote.uuid,
        tenantUuid: OTHER_TENANT,
        authorUuid: 'stale-test-user',
        text: 'nota de otro negocio',
        createdAt: new Date('2026-11-01T15:00:00.000Z'),
      },
    });

    // Fecha de corte fija: hoy = 2026-11-07, así que todo lo anterior a 2026-05-08 es "sin movimiento".
    const result = await storage.findStaleByTenant(TENANT, CUTOFF);
    const names = result.map((patient) => patient.fullName);

    expect(names).toContain('SinNada Prueba');
    expect(names).toContain('NotaAjena Prueba');
    expect(names).not.toContain('ConControl Prueba');
    expect(names).not.toContain('ConCitaFutura Prueba');
  });
});
