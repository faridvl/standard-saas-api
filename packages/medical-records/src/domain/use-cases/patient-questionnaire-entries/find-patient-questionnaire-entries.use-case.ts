import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';
import { PatientQuestionnaireEntryEntity } from '@medical-records/domain/entities/patient-questionnaire-entry.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class FindPatientQuestionnaireEntriesUseCase {
  constructor(
    private readonly storage: PatientQuestionnaireEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    templateUuid?: string,
  ): Promise<PatientQuestionnaireEntryEntity[]> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: true }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const records = await this.storage.findAllByPatient(patientUuid, templateUuid);
    return await Promise.all(
      records.map(async (record) => ({
        ...record,
        createdByName: await this.getOrCreateUser.execute(record.createdByUuid, tenantUuid),
      })),
    );
  }
}
