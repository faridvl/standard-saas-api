import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

const PATIENT_PARAMS = ['patientUuid', 'patientUUID'] as const;
const PATIENT_ROUTE_PREFIXES = ['/patients/:uuid', '/encounters/patient/', '/studies/patient/'];
const PATIENT_ROUTE_MARKER = '/patient/:uuid';

/**
 * Cualquier ruta que cuelgue de un paciente (por `:patientUuid` o por `:uuid` bajo `/patients`)
 * exige que ese paciente sea de la clínica de la sesión; si no, 404. Corre después del guard de
 * autenticación y antes de validar el cuerpo, así que cubre también las rutas futuras.
 */
@Injectable()
export class PatientTenantInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: { tenantUuid?: string };
      }
    >();
    const tenantUuid = request.user?.tenantUuid;
    const patientUuid = this.patientUuidOf(request);
    if (!tenantUuid || !patientUuid) return next.handle();

    const exists = await this.prisma.patient.count({ where: { uuid: patientUuid, tenantUuid } });
    if (exists === 0) throw new NotFoundException('Paciente no encontrado');
    return next.handle();
  }

  private patientUuidOf(request: Request): string | undefined {
    for (const name of PATIENT_PARAMS) {
      const value = request.params?.[name];
      if (typeof value === 'string') return value;
    }
    const routePath = String((request.route as { path?: string } | undefined)?.path ?? '');
    const isPatientRoute =
      PATIENT_ROUTE_PREFIXES.some((prefix) => routePath.startsWith(prefix)) ||
      routePath.includes(PATIENT_ROUTE_MARKER);
    const value = request.params?.uuid;
    return isPatientRoute && typeof value === 'string' ? value : undefined;
  }
}
