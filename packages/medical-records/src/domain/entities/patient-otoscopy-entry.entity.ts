export interface PatientOtoscopyEntryEntity {
  uuid: string;
  patientUuid: string;
  otoscopyRight: string | null;
  otoscopyLeft: string | null;
  createdAt: string;
  /** Null en los registros copiados de la otoscopia única cuando no se sabía quién la guardó. */
  createdByUuid: string | null;
  /** Quién lo registró; null si no hay autor o identity no pudo resolver el nombre. */
  createdByName: string | null;
  /** Cuándo se corrigió por última vez; null si nunca se corrigió. */
  updatedAt: string | null;
  updatedByUuid: string | null;
  updatedByName: string | null;
  /** true si aún es el día (de Costa Rica) en que se creó; el front no recalcula la fecha. */
  canEdit: boolean;
}

export interface OtoscopyText {
  otoscopyRight: string | null;
  otoscopyLeft: string | null;
}

export interface CreatePatientOtoscopyEntryData extends OtoscopyText {
  tenantUuid: string;
  patientUuid: string;
  createdByUuid: string;
}

export interface UpdatePatientOtoscopyEntryData extends OtoscopyText {
  updatedAt: Date;
  updatedByUuid: string;
}
