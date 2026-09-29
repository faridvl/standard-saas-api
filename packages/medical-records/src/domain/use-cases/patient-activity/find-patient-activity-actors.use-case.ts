import { Injectable } from '@nestjs/common';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { PatientActivityActor } from '@medical-records/domain/types/patient-activity.types';

/**
 * Quienes tienen al menos una acción en la bitácora del tenant. Alimenta el
 * filtro "Registrado por": salen de los datos, no de una lista fija, para
 * que un usuario nuevo aparezca solo en cuanto hace algo.
 */
@Injectable()
export class FindPatientActivityActorsUseCase {
  constructor(
    private readonly storage: PatientActivityStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(tenantUuid: string): Promise<PatientActivityActor[]> {
    const actorUuids = await this.storage.findActorUuids(tenantUuid);

    const actors = await Promise.all(
      actorUuids.map(async (uuid) => ({
        uuid,
        fullName: await this.getOrCreateUser.execute(uuid, tenantUuid),
      })),
    );

    return actors.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }
}
