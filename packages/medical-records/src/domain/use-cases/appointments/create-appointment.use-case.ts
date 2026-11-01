import { CreateAppointmentDto } from '@medical-records/app/dtos/appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { assertBranchBelongsToPatient } from '@medical-records/domain/services/patient-branches';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
  ) {}

  async execute(
    tenantUUID: string,
    dto: CreateAppointmentDto & { userUUID: string },
  ): Promise<Appointment> {
    if (dto.branchUUID) {
      const patientBranches = await this.patientStorage.findBranchUuids(
        dto.patientUUID,
        tenantUUID,
      );
      assertBranchBelongsToPatient(dto.branchUUID, patientBranches ?? []);
    }

    const appointmentData: Partial<Appointment> = {
      patientUUID: dto.patientUUID,
      userUUID: dto.userUUID,
      typeUUID: dto.typeUUID,
      branchUUID: dto.branchUUID,
      speciality: dto.speciality,
      status: dto.status || AppointmentStatus.PENDING,
      schedule: {
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
      notes: dto.notes,
    };

    return this.storage.create(appointmentData, tenantUUID);
  }
}
