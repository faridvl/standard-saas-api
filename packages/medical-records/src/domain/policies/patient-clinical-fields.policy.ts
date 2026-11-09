/** Campos clínicos del registro general del paciente: solo los ve quien atiende pacientes. */
export const PATIENT_CLINICAL_FIELDS = ['bloodType'] as const;

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
