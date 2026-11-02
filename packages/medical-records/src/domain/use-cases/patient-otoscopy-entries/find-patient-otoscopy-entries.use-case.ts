import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from '@medical-records/infrastructure/adapters/patientOtoscopyEntryRepository/patient-otoscopy-entry.storage';
import { PatientOtoscopyEntryEntity } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { isSameClinicDay } from '@medical-records/domain/utils/clinic-day.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class FindPatientOtoscopyEntriesUseCase {
  constructor(
    private readonly storage: PatientOtoscopyEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    now: Date = new Date(),
  ): Promise<PatientOtoscopyEntryEntity[]> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const records = await this.storage.findAllByPatient(patientUuid, tenantUuid);
    return await Promise.all(
      records.map(async (record) => {
        const [createdByName, updatedByName] = await Promise.all([
          record.createdByUuid
            ? this.getOrCreateUser.execute(record.createdByUuid, tenantUuid)
            : null,
          record.updatedByUuid
            ? this.getOrCreateUser.execute(record.updatedByUuid, tenantUuid)
            : null,
        ]);
        return {
          ...record,
          createdByName,
          updatedByName,
          canEdit: isSameClinicDay(record.createdAt, now),
        };
      }),
    );
  }
}
