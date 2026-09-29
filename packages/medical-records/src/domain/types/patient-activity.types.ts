/**
 * Acciones que quedan en la bitácora de pacientes. Son las que el personal
 * hace hoy desde el back-office; una acción nueva se agrega aquí y en el
 * caso de uso que la origina.
 */
export enum PatientActivityAction {
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  CONTACT_ADDED = 'CONTACT_ADDED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_REMOVED = 'CONTACT_REMOVED',
  NOTE_ADDED = 'NOTE_ADDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_RENAMED = 'DOCUMENT_RENAMED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  APPOINTMENT_TENTATIVE = 'APPOINTMENT_TENTATIVE',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

/** Un campo del paciente que cambió, con su valor antes y después. */
export interface PatientFieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

/**
 * Payload de `detail` por acción. Se guarda como JSON; el front arma el
 * texto de la columna "Detalle" a partir de estas claves.
 */
export type PatientActivityDetail =
  | { changes: PatientFieldChange[] }
  | { name: string; phone: string; before?: { name: string; phone: string } }
  | { category: string; excerpt: string }
  | { documentUuid: string; originalName: string; category: string }
  | { documentUuid: string; before: string; after: string }
  | { month: string; typeUuid: string | null; typeName: string | null }
  | { appointmentUuid: string; date: string; typeUuid: string | null; typeName: string | null }
  | { before: string; after: string; reason: string | null; date: string | null };

export interface RecordPatientActivityInput {
  tenantUuid: string;
  patientUuid: string;
  actorUuid: string;
  action: PatientActivityAction;
  detail?: PatientActivityDetail | null;
}

export interface PatientActivityItem {
  uuid: string;
  patientUuid: string;
  patientName: string;
  /** Sede actual del paciente (no la del momento), para la píldora de color. */
  patientBranchUuid: string | null;
  actorUuid: string;
  actorName: string | null;
  action: PatientActivityAction;
  detail: PatientActivityDetail | null;
  createdAt: Date;
}

export interface PatientActivityFilters {
  page: number;
  limit: number;
  actorUuid?: string;
  actions?: PatientActivityAction[];
  from?: Date;
  to?: Date;
  search?: string;
  /** Sede actual del paciente. */
  branchUuid?: string;
  /** Tipo de cita guardado en el detalle (solo las acciones de cita lo tienen). */
  appointmentTypeUuid?: string;
}

export interface PatientActivityActor {
  uuid: string;
  fullName: string | null;
}

export interface PatientActivitySummary {
  total: number;
  byAction: Partial<Record<PatientActivityAction, number>>;
  byActor: { actorUuid: string; actorName: string | null; count: number }[];
}
