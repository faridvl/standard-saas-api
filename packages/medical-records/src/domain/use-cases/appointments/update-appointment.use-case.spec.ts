import { describe, it, expect, jest } from '@jest/globals';
import { UpdateAppointmentUseCase } from './update-appointment.use-case';
import { AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

describe('UpdateAppointmentUseCase: bitácora', () => {
  const buildUseCase = (startTime: string) => {
    const appointment = {
      id: 'appointment-1',
      patientUUID: 'patient-1',
      branchUUID: null,
      typeUUID: null,
      typeName: null,
      status: AppointmentStatus.WAITING,
      schedule: { startTime: new Date(startTime) },
    };
    const storage = {
      findOne: () => Promise.resolve({ ...appointment, status: AppointmentStatus.CONFIRMED }),
      update: () => Promise.resolve(appointment),
    };
    const execute = jest.fn().mockResolvedValue(undefined);
    const useCase = new UpdateAppointmentUseCase(
      storage as never,
      {} as never,
      {} as never,
      { execute } as never,
    );
    return { useCase, execute };
  };

  it('anota el día de la cita en hora de Costa Rica: 31 de octubre 19:00 sigue siendo 31 de octubre', async () => {
    const { useCase, execute } = buildUseCase('2026-11-01T01:00:00.000Z');

    await useCase.execute(
      'appointment-1',
      'tenant-1',
      { status: AppointmentStatus.WAITING } as never,
      'user-1',
    );

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PatientActivityAction.APPOINTMENT_ARRIVED,
        detail: expect.objectContaining({ date: '2026-10-31' }),
      }),
    );
  });
});
