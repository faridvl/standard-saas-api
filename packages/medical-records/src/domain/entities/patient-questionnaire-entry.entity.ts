import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';
import { PatientBackgroundAnswer } from '@medical-records/domain/entities/patient-background.entity';

/** Nombre de la sección y sus preguntas tal como estaban al llenarla. */
export interface QuestionnaireTemplateSnapshot {
  name: string;
  fields: ClinicalFieldDefinition[];
}

export interface PatientQuestionnaireEntryEntity {
  uuid: string;
  patientUuid: string;
  templateUuid: string;
  templateSnapshot: QuestionnaireTemplateSnapshot;
  answers: Record<string, PatientBackgroundAnswer>;
  createdAt: string;
  createdByUuid: string;
  /** Quién lo llenó; null si identity no pudo resolver el nombre. */
  createdByName: string | null;
  /** Cuándo se corrigió por última vez; null si nunca se corrigió. */
  updatedAt: string | null;
  updatedByUuid: string | null;
  updatedByName: string | null;
  /** true si aún es el día (de Costa Rica) en que se llenó; el front no recalcula la fecha. */
  canEdit: boolean;
}

export interface CreatePatientQuestionnaireEntryData {
  patientUuid: string;
  templateUuid: string;
  templateSnapshot: QuestionnaireTemplateSnapshot;
  answers: Record<string, PatientBackgroundAnswer>;
  createdByUuid: string;
}

export interface UpdatePatientQuestionnaireEntryData {
  answers: Record<string, PatientBackgroundAnswer>;
  updatedAt: Date;
  updatedByUuid: string;
}
