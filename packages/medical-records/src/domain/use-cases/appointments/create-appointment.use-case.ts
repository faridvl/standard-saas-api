import { CreateAppointmentDto } from '@medical-records/app/dtos/appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { assertAppointmentBranch } from '@medical-records/domain/services/patient-branches';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
    private readonly branchStorage: BranchStorage,
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
      if (!patientBranches) {
        throw new NotFoundException(`Paciente con UUID ${dto.patientUUID} no encontrado`);
      }
      assertAppointmentBranch(
        dto.branchUUID,
        patientBranches,
        await this.branchStorage.findUuidsInTenant(tenantUUID, [dto.branchUUID]),
      );
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
