import { Injectable } from '@nestjs/common';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { PatientActivitySummary } from '@medical-records/domain/types/patient-activity.types';

/**
 * Totales de la bitácora en un rango: cuántas acciones hubo, de qué tipo y
 * de quién. El rango lo manda el cliente (`from`/`to`) porque "hoy" y "este
 * mes" dependen de la zona horaria de la clínica, no de la del servidor.
 */
@Injectable()
export class SummarizePatientActivityUseCase {
  constructor(
    private readonly storage: PatientActivityStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(tenantUuid: string, from?: Date, to?: Date): Promise<PatientActivitySummary> {
    const rows = await this.storage.countByActionAndActor(tenantUuid, from, to);

    const summary: PatientActivitySummary = { total: 0, byAction: {}, byActor: [] };
    const actorCounts = new Map<string, number>();

    for (const row of rows) {
      summary.total += row.count;
      summary.byAction[row.action] = (summary.byAction[row.action] ?? 0) + row.count;
      actorCounts.set(row.actorUuid, (actorCounts.get(row.actorUuid) ?? 0) + row.count);
    }

    summary.byActor = await Promise.all(
      [...actorCounts.entries()].map(async ([actorUuid, count]) => ({
        actorUuid,
        actorName: actorUuid ? await this.getOrCreateUser.execute(actorUuid, tenantUuid) : null,
        count,
      })),
    );
    summary.byActor.sort((a, b) => b.count - a.count);

    return summary;
  }
}
