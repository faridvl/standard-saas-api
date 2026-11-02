import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from '@medical-records/infrastructure/adapters/patientOtoscopyEntryRepository/patient-otoscopy-entry.storage';
import { PatientOtoscopyEntryEntity } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { isSameClinicDay } from '@medical-records/domain/utils/clinic-day.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

const isString = (value: string | null): value is string => value !== null;

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
    const authorUuids = [
      ...new Set(
        records.flatMap((record) => [record.createdByUuid, record.updatedByUuid]).filter(isString),
      ),
    ];
    const names = new Map(
      await Promise.all(
        authorUuids.map(
          async (uuid) => [uuid, await this.getOrCreateUser.execute(uuid, tenantUuid)] as const,
        ),
      ),
    );
    const nameOf = (uuid: string | null) => (uuid ? (names.get(uuid) ?? null) : null);

    return records.map((record) => ({
      ...record,
      createdByName: nameOf(record.createdByUuid),
      updatedByName: nameOf(record.updatedByUuid),
      canEdit: isSameClinicDay(record.createdAt, now),
    }));
  }
}
