import { ForbiddenException } from '@nestjs/common';

/** Plantilla con las preguntas de la historia clínica de la clínica. */
export const CLINICAL_HISTORY_SPECIALITY = 'CLINICAL_HISTORY';

const CLINICAL_HISTORY_EDITOR_ROLES = ['OWNER', 'ADMIN'];

/**
 * Las preguntas de la historia clínica solo las cambia un administrador. El
 * resto de las plantillas sigue abierto como antes: otros productos las editan
 * con cualquier rol.
 */
export function assertCanEditTemplate(speciality: string | undefined, role?: string | null): void {
  if (speciality !== CLINICAL_HISTORY_SPECIALITY) return;
  if (!CLINICAL_HISTORY_EDITOR_ROLES.includes(role ?? '')) {
    throw new ForbiddenException(
      'Solo un administrador puede cambiar las preguntas de la historia clínica',
    );
  }
}
