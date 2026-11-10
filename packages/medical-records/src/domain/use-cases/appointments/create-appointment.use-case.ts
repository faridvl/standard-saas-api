import { CreateAppointmentDto } from '@medical-records/app/dtos/appointment.dto';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import {
  assertAppointmentBranch,
  assertBranchesActive,
} from '@medical-records/domain/services/patient-branches';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly storage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
    private readonly branchStorage: BranchStorage,
    private readonly appointmentTypeStorage: AppointmentTypeStorage,
  ) {}

  async execute(
    tenantUUID: string,
    dto: CreateAppointmentDto & { userUUID: string },
  ): Promise<Appointment> {
    const patientBranches = await this.patientStorage.findBranchUuids(dto.patientUUID, tenantUUID);
    if (!patientBranches) {
      throw new NotFoundException(`Paciente con UUID ${dto.patientUUID} no encontrado`);
    }
    if (dto.typeUUID && !(await this.appointmentTypeStorage.findByUuid(tenantUUID, dto.typeUUID))) {
      throw new NotFoundException(`Tipo de cita con UUID ${dto.typeUUID} no encontrado`);
    }

    if (dto.branchUUID) {
      assertAppointmentBranch(
        dto.branchUUID,
        patientBranches,
        await this.branchStorage.findUuidsInTenant(tenantUUID, [dto.branchUUID]),
      );
      assertBranchesActive(
        [dto.branchUUID],
        await this.branchStorage.findInactiveUuids(tenantUUID, [dto.branchUUID]),
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
