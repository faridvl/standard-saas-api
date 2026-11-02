import { describe, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CreateAppointmentUseCase } from './create-appointment.use-case';
import { DeleteAppointmentUseCase } from './delete-appointment.use-case';
import { ScheduleNextAppointmentUseCase } from './schedule-next-appointment.use-case';
import { UpdateAppointmentUseCase } from './update-appointment.use-case';

const TENANT = 'tenant-1';
const OWN_PATIENT = 'patient-1';
const OWN_TYPE = 'type-1';
const FOREIGN = 'de-otro-tenant';

const notFoundOnForeign = (uuid: string) =>
  uuid === FOREIGN
    ? Promise.reject(new NotFoundException('Cita no encontrada'))
    : Promise.resolve({});

describe('citas: aislamiento entre clínicas', () => {
  it('editar una cita de otro tenant responde 404 y no actualiza', async () => {
    const update = jest.fn();
    const useCase = new UpdateAppointmentUseCase(
      { findOne: notFoundOnForeign, update } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(useCase.execute(FOREIGN, TENANT, { notes: 'x' } as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('borrar una cita de otro tenant responde 404 y no borra', async () => {
    const remove = jest.fn();
    const useCase = new DeleteAppointmentUseCase({
      findOne: notFoundOnForeign,
      delete: remove,
    } as never);

    await expect(useCase.execute(FOREIGN, TENANT)).rejects.toBeInstanceOf(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });

  describe('crear cita', () => {
    const build = () => {
      const create = jest.fn().mockResolvedValue({});
      const useCase = new CreateAppointmentUseCase(
        { create } as never,
        {
          findBranchUuids: (uuid: string, tenantUuid: string) =>
            Promise.resolve(uuid === OWN_PATIENT && tenantUuid === TENANT ? [] : null),
        } as never,
        {} as never,
        {
          findByUuid: (tenantUuid: string, uuid: string) =>
            Promise.resolve(uuid === OWN_TYPE && tenantUuid === TENANT ? {} : null),
        } as never,
      );
      return { useCase, create };
    };
    const dto = (patientUUID: string, typeUUID?: string) =>
      ({
        patientUUID,
        typeUUID,
        userUUID: 'user-1',
        date: '2026-11-10',
        startTime: '2026-11-10T16:00:00.000Z',
        endTime: '2026-11-10T16:30:00.000Z',
      }) as never;

    it('un paciente de otro tenant responde 404 aunque no mande sede', async () => {
      const { useCase, create } = build();

      await expect(useCase.execute(TENANT, dto(FOREIGN))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('un tipo de cita de otro tenant responde 404', async () => {
      const { useCase, create } = build();

      await expect(useCase.execute(TENANT, dto(OWN_PATIENT, FOREIGN))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('un paciente y tipo del tenant crean la cita', async () => {
      const { useCase, create } = build();

      await useCase.execute(TENANT, dto(OWN_PATIENT, OWN_TYPE));

      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('próxima cita del paciente', () => {
    const build = () => {
      const cancel = jest.fn();
      const create = jest.fn();
      const useCase = new ScheduleNextAppointmentUseCase(
        { cancelConfirmedFutureByPatient: cancel, create } as never,
        {
          findByUuid: (uuid: string, tenantUuid: string) =>
            Promise.resolve(
              uuid === OWN_PATIENT && tenantUuid === TENANT ? { status: 'ACTIVE' } : null,
            ),
        } as never,
        {} as never,
        { findByUuid: () => Promise.resolve(null) } as never,
        {} as never,
      );
      return { useCase, cancel, create };
    };

    it('un paciente de otro tenant responde 404 y no cancela ni crea citas', async () => {
      const { useCase, cancel, create } = build();

      await expect(
        useCase.execute(FOREIGN, TENANT, 'user-1', { date: '2026-11-10' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(cancel).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it('un tipo de cita de otro tenant responde 404 antes de cancelar la cita vigente', async () => {
      const { useCase, cancel, create } = build();

      await expect(
        useCase.execute(OWN_PATIENT, TENANT, 'user-1', {
          date: '2026-11-10',
          typeUUID: FOREIGN,
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(cancel).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });
});
