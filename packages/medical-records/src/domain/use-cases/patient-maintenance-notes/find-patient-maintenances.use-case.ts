import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientMaintenanceNoteStorage } from '@medical-records/infrastructure/adapters/patientMaintenanceNoteRepository/patient-maintenance-note.storage';
import {
  PatientMaintenanceEntity,
  PatientMaintenanceNoteEntity,
} from '@medical-records/domain/entities/patient-maintenance.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { MAINTENANCE_NUMBERS } from '@medical-records/app/dtos/update-patient-maintenance.dto';

@Injectable()
export class FindPatientMaintenancesUseCase {
  constructor(
    private readonly storage: PatientMaintenanceNoteStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientMaintenanceEntity[]> {
    const statuses = await this.storage.findStatuses(patientUuid, tenantUuid);
    if (!statuses) throw new NotFoundException('Paciente no encontrado');

    const records = await this.storage.findAllByPatient(patientUuid, tenantUuid);
    const notes = await Promise.all(
      records.map(
        async (record): Promise<{ number: number; note: PatientMaintenanceNoteEntity }> => ({
          number: record.number,
          note: {
            uuid: record.uuid,
            text: record.text,
            createdAt: record.createdAt,
            createdByUuid: record.createdByUuid,
            createdByName: record.createdByUuid
              ? await this.getOrCreateUser.execute(record.createdByUuid, tenantUuid)
              : null,
          },
        }),
      ),
    );

    return MAINTENANCE_NUMBERS.map((number, index) => ({
      number,
      status: statuses[index],
      notes: notes.filter((entry) => entry.number === number).map((entry) => entry.note),
    }));
  }
}
