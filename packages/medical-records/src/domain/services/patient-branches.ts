import { BadRequestException } from '@nestjs/common';

/** Sedes de un paciente: la principal (Patient.branchUuid) siempre es la primera de la lista. */
export interface PatientBranchSelection {
  branchUuid: string | null;
  branchUuids: string[];
}

interface BranchInput {
  branchUuid?: string | null;
  branchUuids?: string[];
}

/**
 * Decide las sedes finales a partir de lo que mandó el cliente. Devuelve
 * undefined si no mandó ninguna de las dos (no se tocan las sedes).
 * - Solo `branchUuid` (clientes viejos, que solo conocen la principal):
 *   reemplaza la principal y conserva las demás; null saca solo la principal
 *   y, si quedan otras, la primera pasa a principal.
 * - Solo `branchUuids`: la principal actual se conserva si sigue en la lista;
 *   si no, pasa a ser la primera. Lista vacía limpia todas.
 * - Las dos: deben coincidir, la principal tiene que estar en la lista.
 */
export function resolvePatientBranches(
  input: BranchInput,
  current?: PatientBranchSelection,
): PatientBranchSelection | undefined {
  const { branchUuid, branchUuids } = input;
  if (branchUuid === undefined && branchUuids === undefined) return undefined;

  if (branchUuids !== undefined) {
    if (branchUuid && !branchUuids.includes(branchUuid)) {
      throw new BadRequestException('La sede principal debe estar entre las sedes del paciente');
    }
    if (branchUuid === null && branchUuids.length > 0) {
      throw new BadRequestException('La sede principal no puede ser nula si hay sedes');
    }
    const principal =
      branchUuid ??
      (current?.branchUuid && branchUuids.includes(current.branchUuid)
        ? current.branchUuid
        : (branchUuids[0] ?? null));
    return {
      branchUuid: principal,
      branchUuids: principal
        ? [principal, ...branchUuids.filter((uuid) => uuid !== principal)]
        : [],
    };
  }

  const others = (current?.branchUuids ?? []).filter(
    (uuid) => uuid !== branchUuid && uuid !== current?.branchUuid,
  );
  if (!branchUuid) {
    const [principal = null] = others;
    return { branchUuid: principal, branchUuids: others };
  }
  return { branchUuid, branchUuids: [branchUuid, ...others] };
}

/** Toda sede pedida tiene que existir en la clínica del usuario. */
export function assertBranchesExist(requested: string[], found: string[]): void {
  if (requested.some((uuid) => !found.includes(uuid))) {
    throw new BadRequestException('Alguna sede no existe en la clínica');
  }
}

/**
 * Una sede desactivada no se ofrece para registros nuevos. `alreadyHeld` son las
 * sedes que el paciente o la cita ya tienen: se aceptan aunque estén desactivadas.
 */
export function assertBranchesActive(
  requested: string[],
  inactiveUuids: string[],
  alreadyHeld: Array<string | null | undefined> = [],
): void {
  const rejected = requested.some(
    (uuid) => inactiveUuids.includes(uuid) && !alreadyHeld.includes(uuid),
  );
  if (rejected) {
    throw new BadRequestException('La sede está desactivada');
  }
}

/**
 * Una cita se agenda en una sede de la clínica y, si el paciente tiene sedes,
 * en una de ellas. `keepBranchUuid` es la sede de una cita ya vigente del
 * paciente: se acepta aunque el paciente ya no la tenga, para poder reagendar.
 */
export function assertAppointmentBranch(
  branchUuid: string | null | undefined,
  patientBranchUuids: string[],
  branchesInTenant: string[],
  keepBranchUuid?: string | null,
): void {
  if (!branchUuid) return;
  if (!branchesInTenant.includes(branchUuid)) {
    throw new BadRequestException('La sede de la cita no existe en la clínica');
  }
  if (branchUuid === keepBranchUuid || patientBranchUuids.length === 0) return;
  if (!patientBranchUuids.includes(branchUuid)) {
    throw new BadRequestException('La sede de la cita no está entre las sedes del paciente');
  }
}
