import { ForbiddenException } from '@nestjs/common';
import { CLINICAL_ACCESS_ROLES } from './clinical-access.policy';

/** Plantilla con las preguntas de la historia clínica de la clínica. */
export const CLINICAL_HISTORY_SPECIALITY = 'CLINICAL_HISTORY';


/**
 * Las preguntas de la historia clínica las cambia quien tiene acceso clínico. El
 * resto de las plantillas sigue abierto como antes: otros productos las editan
 * con cualquier rol.
 */
export function assertCanEditTemplate(speciality: string | undefined, role?: string | null): void {
  if (speciality !== CLINICAL_HISTORY_SPECIALITY) return;
  if (!CLINICAL_ACCESS_ROLES.includes(role ?? '')) {
    throw new ForbiddenException(
      'El personal administrativo no puede cambiar las preguntas de la historia clínica',
    );
  }
}
