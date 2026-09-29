/**
 * Estado del paciente para la clínica. No es el borrado lógico
 * (`isActive`/`deletedAt`): un paciente inactivo o fallecido sigue existiendo
 * con todo su expediente.
 */
export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  /** Dejó de venir: se mudó, cambió de clínica, no respondió. */
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}
