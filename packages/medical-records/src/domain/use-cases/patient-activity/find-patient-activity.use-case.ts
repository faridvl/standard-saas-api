import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import {
  PatientActivityAction,
  PatientActivityDetail,
  PatientActivityFilters,
  PatientActivityItem,
} from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class FindPatientActivityUseCase {
  constructor(
    private readonly storage: PatientActivityStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(
    tenantUuid: string,
    filters: PatientActivityFilters,
  ): Promise<PaginatedResponse<PatientActivityItem>> {
    const page = await this.storage.findAll(tenantUuid, filters);

    const patientUuids = [...new Set(page.data.map((row) => row.patientUuid))];
    const actorUuids = [...new Set(page.data.map((row) => row.actorUuid))];

    const [branches, actorNames] = await Promise.all([
      this.storage.findPatientBranches(tenantUuid, patientUuids),
      this.resolveActorNames(actorUuids, tenantUuid),
    ]);

    return {
      meta: page.meta,
      data: page.data.map((row) => ({
        uuid: row.uuid,
        patientUuid: row.patientUuid,
        patientName: row.patientName,
        patientBranchUuid: branches.get(row.patientUuid) ?? null,
        actorUuid: row.actorUuid,
        actorName: actorNames.get(row.actorUuid) ?? null,
        action: row.action as PatientActivityAction,
        detail: (row.detail ?? null) as PatientActivityDetail | null,
        createdAt: row.createdAt,
      })),
    };
  }

  /** Un solo get-or-create por usuario distinto de la página, no por fila. */
  private async resolveActorNames(
    actorUuids: string[],
    tenantUuid: string,
  ): Promise<Map<string, string | null>> {
    const entries = await Promise.all(
      actorUuids.map(
        async (uuid) =>
          [uuid, uuid ? await this.getOrCreateUser.execute(uuid, tenantUuid) : null] as const,
      ),
    );
    return new Map(entries);
  }
}
