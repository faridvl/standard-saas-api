import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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

const OTHER_SHIPMENT_UUID = '11111111-1111-4111-8111-111111111111';

const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);

describe('UpdatePatientFlagsUseCase (audífonos en laboratorio)', () => {
  let flags: Record<string, Date | string | null>;
  let shipments: Shipment[];
  let notes: { authorUuid: string; text: string }[];
  let activities: Record<string, unknown>[];
  let useCase: {
    execute: (
      uuid: string,
      tenantUuid: string,
      actorUuid: string,
      dto: never,
    ) => ReturnType<UpdatePatientFlagsUseCase['execute']>;
  };

  const open = () => shipments.find((s) => s.deliveredAt === null);

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    flags = {
      hearingAidsInLabSince: null,
      warrantyActiveSince: null,
      videoCandidateSince: null,
      warrantyExpiredSince: null,
      renewPrescriptionSince: null,
      prioritySince: null,
      priorityReason: null,
      priorityByUuid: null,
    };
    shipments = [];
    notes = [];
    activities = [];

    const storage = {
      findByUuid: (uuid: string, tenantUuid: string) =>
        Promise.resolve(uuid === PATIENT && tenantUuid === TENANT ? { uuid, ...flags } : null),
      updateFlags: (_u: string, _t: string, data: Record<string, Date | string | null>) => {
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
        const activitiesBackup = [...activities];
        try {
          return await work({
            currentFlags: () => Promise.resolve({ ...flags }),
            findOpenShipment: () => Promise.resolve(open() ?? null),
            findLastClosedShipment: () => {
              const closed = shipments
                .filter((shipment) => shipment.deliveredAt !== null)
                .sort(
                  (a, b) => (b.deliveredAt as Date).getTime() - (a.deliveredAt as Date).getTime(),
                );
              return Promise.resolve(closed[0] ?? null);
            },
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
            updateFlags: (data: Record<string, Date | string | null>) => {
              Object.assign(flags, data);
              return Promise.resolve();
            },
            recordActivity: (actorUuid: string, action: string, detail: unknown) => {
              activities.push({ actorUuid, action, detail });
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
          activities = activitiesBackup;
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
    const real = new UpdatePatientFlagsUseCase(
      storage as never,
      labStorage as never,
      recordActivity as never,
    );
    useCase = {
      execute: (uuid, tenantUuid, actorUuid, dto) => real.execute(uuid, tenantUuid, actorUuid, dto),
    };
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
    expect(notes.slice(1)).toEqual([
      {
        authorUuid: 'user-2',
        text: 'Audífonos recibidos del laboratorio el 01/11/2026: Se cambió el receptor',
      },
    ]);
    expect(activities).toEqual([
      expect.objectContaining({
        action: PatientActivityAction.HEARING_AIDS_DELIVERED,
        detail: { date: '2026-11-01', hasNote: true },
      }),
      expect.objectContaining({ action: PatientActivityAction.NOTE_ADDED }),
    ]);
    expect(JSON.stringify(activities[0])).not.toContain('receptor');
  });

  it('entregar sin nota usa hoy y deja la nota de recepción sin texto adicional', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);
    await useCase.execute(PATIENT, TENANT, ACTOR, { hearingAidsInLab: false } as never);

    expect(shipments[0]).toMatchObject({ deliveredAt: noon('2026-11-02'), note: null });
    expect(notes.map((n) => n.text)).toEqual([
      'Audífonos enviados al laboratorio el 30/10/2026',
      'Audífonos recibidos del laboratorio el 02/11/2026',
    ]);
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
    expect(notes.map((n) => n.text)).toEqual(['Audífonos enviados al laboratorio el 30/10/2026']);
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

  it('sin envío abierto (dato viejo) crea uno ya cerrado con el día que tenía el interruptor', async () => {
    flags.hearingAidsInLabSince = noon('2026-10-20');

    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: false,
      deliveredAt: '2026-11-01',
    } as never);

    expect(shipments).toEqual([
      expect.objectContaining({
        sentAt: noon('2026-10-20'),
        deliveredAt: noon('2026-11-01'),
        deliveredByUuid: ACTOR,
      }),
    ]);
    expect(flags.hearingAidsInLabSince).toBeNull();
  });

  it('sin envío abierto, una entrega anterior al día que tenía el interruptor responde 400', async () => {
    flags.hearingAidsInLabSince = noon('2026-10-20');

    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-10-19',
      } as never),
    ).rejects.toThrow(
      new BadRequestException(
        'La fecha de entrega no puede ser anterior a la de envío (20/10/2026)',
      ),
    );
    expect(shipments).toEqual([]);
    expect(flags.hearingAidsInLabSince).toEqual(noon('2026-10-20'));
  });

  describe('corrección con shipmentUuid', () => {
    const openShipment = async () => {
      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-30',
      } as never);
      return shipments[0].uuid;
    };

    it('con el uuid del envío abierto corrige su fecha', async () => {
      const shipmentUuid = await openShipment();

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-28',
        shipmentUuid,
      } as never);

      expect(shipments).toHaveLength(1);
      expect(shipments[0].sentAt).toEqual(noon('2026-10-28'));
      expect(flags.hearingAidsInLabSince).toEqual(noon('2026-10-28'));
    });

    it('con el envío ya entregado responde 409 y no lo reabre', async () => {
      const shipmentUuid = await openShipment();
      await useCase.execute(PATIENT, TENANT, ACTOR, { hearingAidsInLab: false } as never);

      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: true,
          hearingAidsInLabDate: '2026-10-28',
          shipmentUuid,
        } as never),
      ).rejects.toThrow(new ConflictException('Este envío ya fue entregado. Recarga la página.'));
      expect(shipments).toHaveLength(1);
      expect(shipments[0].deliveredAt).not.toBeNull();
      expect(flags.hearingAidsInLabSince).toBeNull();
    });

    it('con un uuid que no es el del envío abierto responde 409', async () => {
      await openShipment();

      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: true,
          hearingAidsInLabDate: '2026-10-28',
          shipmentUuid: OTHER_SHIPMENT_UUID,
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(shipments[0].sentAt).toEqual(noon('2026-10-30'));
    });

    it('sin shipmentUuid y con el interruptor apagado sigue abriendo un envío', async () => {
      await openShipment();
      await useCase.execute(PATIENT, TENANT, ACTOR, { hearingAidsInLab: false } as never);

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-11-02',
      } as never);

      expect(shipments).toHaveLength(2);
      expect(open()?.sentAt).toEqual(noon('2026-11-02'));
    });
  });

  describe('entrega duplicada', () => {
    it('con deliveredAt o nota y el interruptor ya apagado responde 409', async () => {
      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: false,
          note: 'Se perdería',
        } as never),
      ).rejects.toThrow(new ConflictException('Los audífonos ya se marcaron como entregados.'));
      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: false,
          deliveredAt: '2026-11-01',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notes).toEqual([]);
      expect(shipments).toEqual([]);
    });
  });

  describe('envíos encimados', () => {
    const deliveredOn = async (sent: string, delivered: string) => {
      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: sent,
      } as never);
      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: delivered,
      } as never);
    };

    it('abrir un envío antes de la última entrega responde 400', async () => {
      await deliveredOn('2026-10-20', '2026-10-25');

      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: true,
          hearingAidsInLabDate: '2026-10-24',
        } as never),
      ).rejects.toThrow(
        new BadRequestException(
          'La fecha de envío no puede ser anterior a la última entrega (25/10/2026)',
        ),
      );
      expect(open()).toBeUndefined();
      expect(flags.hearingAidsInLabSince).toBeNull();
    });

    it('abrir el mismo día de la última entrega se permite', async () => {
      await deliveredOn('2026-10-20', '2026-10-25');

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-25',
      } as never);

      expect(open()?.sentAt).toEqual(noon('2026-10-25'));
    });

    it('corregir el envío abierto a antes de la última entrega responde 400', async () => {
      await deliveredOn('2026-10-20', '2026-10-25');
      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-28',
      } as never);

      await expect(
        useCase.execute(PATIENT, TENANT, ACTOR, {
          hearingAidsInLab: true,
          hearingAidsInLabDate: '2026-10-22',
          shipmentUuid: (open() as Shipment).uuid,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(open()?.sentAt).toEqual(noon('2026-10-28'));
    });
  });

  describe('nota de la entrega', () => {
    const sendToLab = () =>
      useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-30',
      } as never);

    it('entregar sin nota cierra el envío', async () => {
      await sendToLab();

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-11-01',
      } as never);

      expect(shipments[0].deliveredAt).toEqual(noon('2026-11-01'));
      expect(flags.hearingAidsInLabSince).toBeNull();
    });

    it('entregar con nota deja la nota de evolución', async () => {
      await sendToLab();

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        note: 'Nota',
      } as never);

      expect(notes.map((n) => n.text)).toEqual([
        'Audífonos enviados al laboratorio el 30/10/2026',
        'Audífonos recibidos del laboratorio el 02/11/2026: Nota',
      ]);
    });

    it('entregar sin nota deja una nota de recepción sin el sufijo', async () => {
      await sendToLab();

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-11-01',
      } as never);

      expect(notes).toHaveLength(2);
      expect(notes[1]).toEqual({
        authorUuid: ACTOR,
        text: 'Audífonos recibidos del laboratorio el 01/11/2026',
      });
    });

    it('un envío nuevo deja la nota de envío con la fecha en hora de Costa Rica y su evento', async () => {
      await sendToLab();

      expect(notes).toEqual([
        { authorUuid: ACTOR, text: 'Audífonos enviados al laboratorio el 30/10/2026' },
      ]);
      expect(activities).toContainEqual(
        expect.objectContaining({
          action: PatientActivityAction.NOTE_ADDED,
          detail: {
            category: 'EVOLUTION_CONTROL',
            excerpt: 'Audífonos enviados al laboratorio el 30/10/2026',
          },
        }),
      );
    });

    it('corregir la fecha de un envío abierto no deja nota', async () => {
      await sendToLab();
      notes.length = 0;

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-28',
      } as never);

      expect(notes).toEqual([]);
    });

    it('entregar un dato viejo sin envío abierto deja la nota de recepción', async () => {
      flags.hearingAidsInLabSince = noon('2026-10-20');

      await useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-11-01',
        note: 'Listo',
      } as never);

      expect(notes.map((n) => n.text)).toEqual([
        'Audífonos recibidos del laboratorio el 01/11/2026: Listo',
      ]);
    });
  });

  it('una entrega rechazada no deja eventos en la bitácora', async () => {
    await useCase.execute(PATIENT, TENANT, ACTOR, {
      hearingAidsInLab: true,
      hearingAidsInLabDate: '2026-10-30',
    } as never);
    activities.length = 0;

    await expect(
      useCase.execute(PATIENT, TENANT, ACTOR, {
        hearingAidsInLab: false,
        deliveredAt: '2026-10-29',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(activities).toEqual([]);
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

  describe('prioridad con motivo', () => {
    const mark = (priorityReason?: string) =>
      useCase.execute(PATIENT, TENANT, ACTOR, { isPriority: true, priorityReason } as never);

    it('marcar guarda motivo, quién y cuándo, deja la nota y los eventos', async () => {
      await mark('  Pérdida de audición rápida  ');

      expect(flags.prioritySince).toEqual(NOW);
      expect(flags.priorityReason).toBe('Pérdida de audición rápida');
      expect(flags.priorityByUuid).toBe(ACTOR);
      expect(notes).toEqual([
        {
          authorUuid: ACTOR,
          text: 'Paciente marcado como prioridad: Pérdida de audición rápida',
        },
      ]);
      expect(activities).toEqual([
        expect.objectContaining({
          action: PatientActivityAction.PRIORITY_CHANGED,
          detail: { isOn: true },
        }),
        expect.objectContaining({
          action: PatientActivityAction.NOTE_ADDED,
          detail: {
            category: 'EVOLUTION_CONTROL',
            excerpt: 'Paciente marcado como prioridad: Pérdida de audición rápida',
          },
        }),
      ]);
    });

    it('marcar sin motivo, vacío o solo con espacios responde 400 y no cambia nada', async () => {
      await expect(mark()).rejects.toBeInstanceOf(BadRequestException);
      await expect(mark('   ')).rejects.toBeInstanceOf(BadRequestException);

      expect(flags.prioritySince).toBeNull();
      expect(flags.priorityReason).toBeNull();
      expect(notes).toEqual([]);
      expect(activities).toEqual([]);
    });

    it('desmarcar limpia los tres campos y deja la nota de quitar prioridad', async () => {
      await mark('Motivo');
      notes.length = 0;
      activities.length = 0;

      await useCase.execute(PATIENT, TENANT, 'user-2', { isPriority: false } as never);

      expect(flags.prioritySince).toBeNull();
      expect(flags.priorityReason).toBeNull();
      expect(flags.priorityByUuid).toBeNull();
      expect(notes).toEqual([{ authorUuid: 'user-2', text: 'Se quitó la prioridad' }]);
      expect(activities).toEqual([
        expect.objectContaining({
          action: PatientActivityAction.PRIORITY_CHANGED,
          detail: { isOn: false },
        }),
        expect.objectContaining({ action: PatientActivityAction.NOTE_ADDED }),
      ]);
    });

    it('marcar lo que ya está marcado no pide motivo ni deja nota', async () => {
      await mark('Motivo');
      notes.length = 0;
      activities.length = 0;

      await useCase.execute(PATIENT, TENANT, ACTOR, { isPriority: true } as never);

      expect(notes).toEqual([]);
      expect(activities).toEqual([]);
      expect(flags.priorityReason).toBe('Motivo');
    });

    it('desmarcar lo que no está marcado no deja nota', async () => {
      await useCase.execute(PATIENT, TENANT, ACTOR, { isPriority: false } as never);

      expect(notes).toEqual([]);
      expect(activities).toEqual([]);
    });

    it('marcar prioridad junto con enviar audífonos deja las dos notas', async () => {
      await useCase.execute(PATIENT, TENANT, ACTOR, {
        isPriority: true,
        priorityReason: 'Urgente',
        hearingAidsInLab: true,
        hearingAidsInLabDate: '2026-10-30',
      } as never);

      expect(notes.map((n) => n.text).sort()).toEqual([
        'Audífonos enviados al laboratorio el 30/10/2026',
        'Paciente marcado como prioridad: Urgente',
      ]);
    });
  });

  it('un negocio ajeno no puede marcar prioridad en el paciente', async () => {
    await expect(
      useCase.execute(PATIENT, 'otra-clinica', ACTOR, { isPriority: true } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(flags.prioritySince).toBeNull();
  });
});
