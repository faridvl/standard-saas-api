import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import { CreateMedicalControlDto } from '@medical-records/app/dtos/create-medical-control.dto';
import { MedicalControlEntity } from '@medical-records/domain/entities/medical-control.entity';

@Injectable()
export class CreateMedicalControlUseCase {
  constructor(
    private readonly controlStorage: MedicalControlStorage,
    // private readonly followUpStorage: FollowUpStorage,
  ) {}

  async execute(
    dto: CreateMedicalControlDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<MedicalControlEntity> {
    const control = await this.controlStorage.save(
      {
        patientUuid: dto.header.patientUUID,
        appointmentUuid: dto.header.appointmentUUID,
        encounterUuid: dto.header.encounterUuid,
        speciality: dto.header.speciality,
        findings: dto.clinicalData.findings as Prisma.InputJsonValue,
        diagnosis: dto.clinicalData.diagnosis,
        version: dto.header.schemaVersion,
        doctorUuid: context.userUuid,
        followUp: dto.followUp ?? null,
      },
      context.tenantUuid,
    );

    return control;
  }
}
