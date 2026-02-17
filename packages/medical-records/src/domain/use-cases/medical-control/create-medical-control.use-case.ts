import { Injectable } from '@nestjs/common';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import { CreateMedicalControlDto } from '@medical-records/app/dtos/create-medical-control.dto';

@Injectable()
export class CreateMedicalControlUseCase {
  constructor(
    private readonly controlStorage: MedicalControlStorage,
    // private readonly followUpStorage: FollowUpStorage,
  ) {}

  async execute(dto: CreateMedicalControlDto, context: { tenantUuid: string; userUuid: string }) {
    const control = await this.controlStorage.save(
      {
        patientUuid: dto.header.patientUUID,
        appointmentUuid: dto.header.appointmentUUID,
        speciality: dto.header.speciality,
        findings: dto.clinicalData.findings,
        diagnosis: dto.clinicalData.diagnosis,
        version: dto.header.schemaVersion,
        doctorUuid: context.userUuid,
      },
      context.tenantUuid,
    );

    // if (dto.followUp?.hasFollowUp) {
    //   await this.followUpStorage.save(
    //     {
    //       medicalControlUuid: control.uuid,
    //       tentativeDate: dto.followUp.tentativeDate,
    //       notes: dto.followUp.notes,
    //     },
    //     context.tenantUuid,
    //   );
    // }

    return control;
  }
}
