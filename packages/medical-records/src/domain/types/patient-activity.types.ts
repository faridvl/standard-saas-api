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
  /** El paciente llegó a la cita (pasa a WAITING, "en sala"). */
  APPOINTMENT_ARRIVED = 'APPOINTMENT_ARRIVED',
  /** La cita se dio por atendida (pasa a COMPLETED). */
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  /** Los audífonos volvieron del laboratorio y se entregaron; trae el día y si hubo nota (sin el texto). */
  HEARING_AIDS_DELIVERED = 'HEARING_AIDS_DELIVERED',
  /** Se marcó o desmarcó que los audífonos están en el laboratorio. */
  HEARING_AIDS_LAB_CHANGED = 'HEARING_AIDS_LAB_CHANGED',
  /** Se activó o desactivó la garantía. */
  WARRANTY_CHANGED = 'WARRANTY_CHANGED',
  /** Se marcó o desmarcó como candidato a video. */
  VIDEO_CANDIDATE_CHANGED = 'VIDEO_CANDIDATE_CHANGED',
  /** Se marcó o desmarcó la garantía como vencida. */
  WARRANTY_EXPIRED_CHANGED = 'WARRANTY_EXPIRED_CHANGED',
  /** Se marcó o desmarcó que hay que renovar la receta. */
  RENEW_PRESCRIPTION_CHANGED = 'RENEW_PRESCRIPTION_CHANGED',
  /** Un documento pasó a otra sección (DocumentCategory). */
  DOCUMENT_CATEGORY_CHANGED = 'DOCUMENT_CATEGORY_CHANGED',
  /** Se llenó la historia clínica (antecedentes) por primera vez. */
  CLINICAL_HISTORY_CREATED = 'CLINICAL_HISTORY_CREATED',
  /** Se modificó la historia clínica (antecedentes). */
  CLINICAL_HISTORY_UPDATED = 'CLINICAL_HISTORY_UPDATED',
  /** Se modificó la exploración física (otoscopia). */
  PHYSICAL_EXAM_UPDATED = 'PHYSICAL_EXAM_UPDATED',
  /** Cambió el estado de un mantenimiento (sin marcar, asistido o perdido). */
  MAINTENANCE_CHANGED = 'MAINTENANCE_CHANGED',
  /** Histórico: contador de intentos de contacto. Ya no se escribe; se sigue leyendo. */
  CONTACT_ATTEMPTS_CHANGED = 'CONTACT_ATTEMPTS_CHANGED',
  /** Histórico: check de un mantenimiento. Ya no se escribe; se sigue leyendo. */
  MAINTENANCE_CHECK_CHANGED = 'MAINTENANCE_CHECK_CHANGED',
  /** Histórico: nota única de un mantenimiento. Ya no se escribe; se sigue leyendo. */
  MAINTENANCE_NOTE_CHANGED = 'MAINTENANCE_NOTE_CHANGED',
  /** Se agregó una nota al historial de un mantenimiento; el texto no se copia. */
  MAINTENANCE_NOTE_ADDED = 'MAINTENANCE_NOTE_ADDED',
  /** Se llenó una sección propia de la clínica dentro de Preguntas. */
  QUESTIONNAIRE_FILLED = 'QUESTIONNAIRE_FILLED',
  /** Se corrigió un registro de una sección propia de Preguntas. */
  QUESTIONNAIRE_CORRECTED = 'QUESTIONNAIRE_CORRECTED',
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
  | { before: string; after: string; reason: string | null; date: string | null }
  | { isOn: boolean; date?: string; previousDate?: string }
  | { date: string; hasNote: boolean }
  | { number: number; status: string | null; previousStatus: string | null }
  | { count: number; previousCount: number }
  | { number: number; done: boolean }
  | { number: number; excerpt: string | null }
  | { number: number }
  | { templateUuid: string; templateName: string };

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
