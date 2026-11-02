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
}

export interface CreatePatientQuestionnaireEntryData {
  patientUuid: string;
  templateUuid: string;
  templateSnapshot: QuestionnaireTemplateSnapshot;
  answers: Record<string, PatientBackgroundAnswer>;
  createdByUuid: string;
}
