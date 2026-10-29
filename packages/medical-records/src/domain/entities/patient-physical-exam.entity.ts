export interface PatientPhysicalExamEntity {
  uuid: string;
  patientUuid: string;
  otoscopyRight: string | null;
  otoscopyLeft: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUuid: string | null;
  updatedByUuid: string | null;
}

/** Lo que se escribe: undefined no toca el campo al actualizar; null lo limpia. */
export interface PatientPhysicalExamWriteData {
  otoscopyRight?: string | null;
  otoscopyLeft?: string | null;
}
