import { CustomDecorator, SetMetadata } from '@nestjs/common';
import {
  AccessLevel,
  AccessRequirement,
  Specialty,
} from '@medical-records/domain/policies/access.policy';

/** Metadata que lee `AccessGuard`. Una ruta sin ella se rechaza. */
export const ACCESS_METADATA_KEY = 'access';

const requireAccess = (requirement: AccessRequirement): CustomDecorator =>
  SetMetadata(ACCESS_METADATA_KEY, requirement);

/** Cualquier nivel de la clínica (el token debe traer un nivel válido). */
export const AnyLevel = (): CustomDecorator => requireAccess({});

/** Datos clínicos: solo quien atiende pacientes, de cualquier nivel. */
export const ClinicalAccess = (): CustomDecorator => requireAccess({ clinical: true });

/** Configuración y bitácora: ADMIN u OWNER, atienda o no pacientes. */
export const MinLevel = (minLevel: AccessLevel): CustomDecorator => requireAccess({ minLevel });

/** Clínico y además una especialidad (crear o editar pruebas). */
export const RequiresSpecialty = (specialty: Specialty): CustomDecorator =>
  requireAccess({ clinical: true, specialty });
