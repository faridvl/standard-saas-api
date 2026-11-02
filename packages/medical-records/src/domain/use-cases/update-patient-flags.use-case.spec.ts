import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdatePatientFlagsUseCase } from './update-patient-flags.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';
const ACTOR = 'user-1';
const NOW = new Date('2026-11-02T18:00:00.000Z');

interface Shipment {
  uuid: string;
  sentAt: Date;
  deliveredAt: Date | null;
  note: string | null;
  createdByUuid: string | null;
  deliveredByUuid: string | null;
}

const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);

describe('UpdatePatientFlagsUseCase (audífonos en laboratorio)', () => {
  let flags: Record<string, Date | null>;
  let shipments: Shipment[];
  let notes: { authorUuid: string; text: string }[];
  let activities: Record<string, unknown>[];
  let useCase: UpdatePatientFlagsUseCase;

  const open = () => shipments.find((s) => s.deliveredAt === null);

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    flags = {
      hearingAidsInLabSince: null,
      warrantyActiveSince: null,
      videoCandidateSince: null,
      warrantyExpiredSince: null,
      renewPrescriptionSince: null,
    };
    shipments = [];
    notes = [];
    activities = [];

    const storage = {
      findByUuid: (uuid: string, tenantUuid: string) =>
        Promise.resolve(uuid === PATIENT && tenantUuid === TENANT ? { uuid, ...flags } : null),
      updateFlags: (_u: string, _t: string, data: Record<string, Date | null>) => {
        Object.assign(flags, data);
        return Promise.resolve({ uuid: PATIENT, ...flags });
      },
    };
    const labStorage = {
      runLocked: async (
        patientUuid: string,
        tenantUuid: string,
        work: (tx: unknown) => Promise<unknown>,
      ) => {
        if (patientUuid !== PATIENT || tenantUuid !== TENANT) return null;
        // La transacción real deshace todo si falla; la copia imita ese efecto.
        const backup = { flags: { ...flags }, shipments: shipments.map((s) => ({ ...s })) };
        const notesBackup = [...notes];
        try {
          return await work({
            currentFlags: () => Promise.resolve({ ...flags }),
            findOpenShipment: () => Promise.resolve(open() ?? null),
            createShipment: (data: Record<string, unknown>) => {
              shipments.push({
                uuid: `s-${shipments.length + 1}`,
                sentAt: data.sentAt as Date,
                deliveredAt: (data.deliveredAt as Date) ?? null,
                note: (data.note as string) ?? null,
                createdByUuid: data.createdByUuid as string,
                deliveredByUuid: (data.deliveredByUuid as string) ?? null,
              });
              return Promise.resolve();
            },
            updateSentAt: (uuid: string, sentAt: Date) => {
              const s = shipments.find((x) => x.uuid === uuid);
              if (s) s.sentAt = sentAt;
              return Promise.resolve();
            },
            closeShipment: (
              uuid: string,
              data: { deliveredAt: Date; note: string | null; deliveredByUuid: string },
            ) => {
              const s = shipments.find((x) => x.uuid === uuid);
              if (s) Object.assign(s, data);
              return Promise.resolve();
            },
            updateFlags: (data: Record<string, Date | null>) => {
              Object.assign(flags, data);
              return Promise.resolve();
            },
            createEvolutionNote: (authorUuid: string, text: string) => {
              notes.push({ authorUuid, text });
              return Promise.resolve({});
            },
          });
        } catch (error) {
          flags = backup.flags;
          shipments = backup.shipments;
          notes = notesBackup;
          throw error;
        }
      },
    };
    const recordActivity = {
      execute: (input: Record<string, unknown>) => {
        activities.push(input);
        return Promise.resolve();
      },
    };
    useCase = new UpdatePatientFlagsUseCase(
      storage as never,
      labStorage as never,
      recordActivity as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prender con fecha abre un envío con ese día', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);

    expect(shipments).toEqual([
      expect.objectContaining({
        sentAt: noon('2026-10-30'),
        deliveredAt: null,
        createdByUuid: ACTOR,
      }),
    ]);
    expect(flags.hearingAidsInLabSince).toEqual(noon('2026-10-30'));
  });

  it('cambiar la fecha mientras está en laboratorio actualiza el envío abierto', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-28',
    } as never);

    expect(shipments).toHaveLength(1);
    expect(shipments[0].sentAt).toEqual(noon('2026-10-28'));
  });

  it('entregar con nota cierra el envío y crea la nota de evolución con el mismo texto', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);
    activities.length = 0;

    await useCase.execute(PATIENT, 'tenant-1', 'user-2', {
      hearingAidsInLab: false,
      deliveredAt: '2026-11-01',
      note: 'Se cambió el receptor',
    } as never);

    expect(shipments[0]).toMatchObject({
      deliveredAt: noon('2026-11-01'),
      note: 'Se cambió el receptor',
      deliveredByUuid: 'user-2',
    });
    expect(flags.hearingAidsInLabSince).toBeNull();
    expect(notes).toEqual([{ authorUuid: 'user-2', text: 'Se cambió el receptor' }]);
    expect(activities).toEqual([
      expect.objectContaining({
        action: PatientActivityAction.HEARING_AIDS_DELIVERED,
        detail: { date: '2026-11-01', hasNote: true },
      }),
      expect.objectContaining({ action: PatientActivityAction.NOTE_ADDED }),
    ]);
    expect(JSON.stringify(activities[0])).not.toContain('receptor');
  });

  it('entregar sin nota usa hoy y no crea nota de evolución', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);
    await useCase.execute(PATIENT, TENANT, ACTOR, { hearingAidsInLab: false } as never);

    expect(shipments[0]).toMatchObject({ deliveredAt: noon('2026-11-02'), note: null });
    expect(notes).toEqual([]);
  });

  it('una entrega anterior al envío responde 400 y no cambia nada', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);

    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-10-29',
        note: 'x',
      } as never),
    ).rejects.toThrow(
      new BadRequestException(
        'La fecha de entrega no puede ser anterior a la de envío (30/10/2026)',
      ),
    );
    expect(shipments[0].deliveredAt).toBeNull();
    expect(flags.hearingAidsInLabSince).not.toBeNull();
    expect(notes).toEqual([]);
  });

  it('una entrega en el futuro responde 400', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);

    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-11-03',
      } as never),
    ).rejects.toThrow(new BadRequestException('La fecha de entrega no puede ser posterior a hoy'));
  });

  it('sin envío abierto (dato viejo) crea uno ya cerrado con el día de la entrega', async () => {
    flags.hearingAidsInLabSince = noon('2026-10-20');

    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: false,
      deliveredAt: '2026-11-01',
    } as never);

    expect(shipments).toEqual([
      expect.objectContaining({
        sentAt: noon('2026-11-01'),
        deliveredAt: noon('2026-11-01'),
        deliveredByUuid: ACTOR,
      }),
    ]);
    expect(flags.hearingAidsInLabSince).toBeNull();
  });

  it('un paciente de otra clínica responde Paciente no encontrado y no toca envíos', async () => {
    await expect(
      useCase.execute(PATIENT, 'otra-clinica', ACTOR, { hearingAidsInLab: true } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(shipments).toEqual([]);
  });

  it('apagar lo que ya está apagado no escribe ni deja evento', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, { hearingAidsInLab: false } as never);

    expect(shipments).toEqual([]);
    expect(activities).toEqual([]);
  });

  it('los otros indicadores siguen funcionando sin tocar envíos', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, { isVideoCandidate: true } as never);

    expect(flags.videoCandidateSince).toEqual(NOW);
    expect(shipments).toEqual([]);
    expect(activities).toEqual([
      expect.objectContaining({
        action: PatientActivityAction.VIDEO_CANDIDATE_CHANGED,
        detail: { isOn: true },
      }),
    ]);
  });
});
