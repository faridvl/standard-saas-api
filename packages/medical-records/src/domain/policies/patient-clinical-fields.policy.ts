/** Campos clínicos del registro general del paciente: solo los ve quien atiende pacientes. */
export const PATIENT_CLINICAL_FIELDS = ['bloodType', 'priorityReason', 'priorityByName'] as const;

/** Campos clínicos que solo escribe quien atiende pacientes: a los demás se les ignoran. */
export const PATIENT_CLINICAL_WRITE_FIELDS = ['bloodType', 'warrantyDocumentUuid'] as const;

/** Quita los campos clínicos que se escriben si quien guarda no atiende pacientes. */
export function stripPatientClinicalWrites<T extends object>(data: T, attendsPatients: boolean): T {
  if (attendsPatients) return data;
  const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const field of PATIENT_CLINICAL_WRITE_FIELDS) delete copy[field];
  return copy as T;
}

/** Quita los campos clínicos si quien consulta no atiende pacientes; si atiende, devuelve el registro igual. */
export function filterPatientClinicalFields<T extends object>(
  patient: T,
  attendsPatients: boolean,
): T {
  if (attendsPatients) return patient;
  const copy: Record<string, unknown> = { ...(patient as Record<string, unknown>) };
  for (const field of PATIENT_CLINICAL_FIELDS) delete copy[field];
  return copy as T;
}
