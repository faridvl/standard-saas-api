import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientLabShipmentStorage } from '@medical-records/infrastructure/adapters/patientLabShipmentRepository/patient-lab-shipment.storage';
import { PatientLabShipmentEntity } from '@medical-records/domain/entities/patient-lab-shipment.entity';
import { toClinicDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';
import { UserStorage } from '@medical-records/infrastructure/adapters/userRepository/user.storage';

const isString = (value: string | null): value is string => value !== null;

@Injectable()
export class FindPatientLabShipmentsUseCase {
  constructor(
    private readonly storage: PatientLabShipmentStorage,
    private readonly userStorage: UserStorage,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    attendsPatients: boolean | undefined,
  ): Promise<PatientLabShipmentEntity[]> {
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
    // Solo lee la copia local de usuarios: un GET no debe escribir ni llamar a identity.
    const names = new Map(
      await Promise.all(
        authorUuids.map(
          async (uuid) =>
            [uuid, (await this.userStorage.findByUuid(uuid))?.fullName ?? null] as const,
        ),
      ),
    );
    const canSeeNotes = attendsPatients === true;
    const nameOf = (uuid: string | null) => (uuid ? (names.get(uuid) ?? null) : null);

    return records.map((record) => ({
      uuid: record.uuid,
      sentAt: toClinicDayKey(record.sentAt),
      deliveredAt: record.deliveredAt ? toClinicDayKey(record.deliveredAt) : null,
      note: canSeeNotes ? record.note : null,
      createdByUuid: record.createdByUuid,
      createdByName: nameOf(record.createdByUuid),
      deliveredByUuid: record.deliveredByUuid,
      deliveredByName: nameOf(record.deliveredByUuid),
    }));
  }
}
