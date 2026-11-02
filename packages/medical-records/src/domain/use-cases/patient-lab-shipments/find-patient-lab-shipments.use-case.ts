import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientLabShipmentStorage } from '@medical-records/infrastructure/adapters/patientLabShipmentRepository/patient-lab-shipment.storage';
import { PatientLabShipmentEntity } from '@medical-records/domain/entities/patient-lab-shipment.entity';
import { toClinicDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

const isString = (value: string | null): value is string => value !== null;

@Injectable()
export class FindPatientLabShipmentsUseCase {
  constructor(
    private readonly storage: PatientLabShipmentStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientLabShipmentEntity[]> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const records = await this.storage.findAllByPatient(patientUuid, tenantUuid);
    const authorUuids = [
      ...new Set(
        records
          .flatMap((record) => [record.createdByUuid, record.deliveredByUuid])
          .filter(isString),
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
      uuid: record.uuid,
      sentAt: toClinicDayKey(record.sentAt),
      deliveredAt: record.deliveredAt ? toClinicDayKey(record.deliveredAt) : null,
      note: record.note,
      createdByUuid: record.createdByUuid,
      createdByName: nameOf(record.createdByUuid),
      deliveredByUuid: record.deliveredByUuid,
      deliveredByName: nameOf(record.deliveredByUuid),
    }));
  }
}
