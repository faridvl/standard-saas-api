import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';

export type PatientBackgroundAnswer = boolean | string | { value: boolean; detail?: string | null };

export interface PatientBackgroundEntity {
  uuid: string;
  patientUuid: string;
  earInfections: boolean;
  nasalSurgery: boolean;
  throatSurgery: boolean;
  earSurgery: boolean;
  diabetes: boolean;
  cholesterol: boolean;
  highPressure: boolean;
  allergies: boolean;
  rhinitis: boolean;
  vertigo: boolean;
  tinnitus: boolean;
  headacheNoise: boolean;
  cloggedEar: boolean;
  dizziness: boolean;
  tinnitusTone: string | null;
  otoscopyRight: string | null;
  otoscopyLeft: string | null;
  notes: string | null;
  answers: Record<string, PatientBackgroundAnswer> | null;
  templateSnapshot: ClinicalFieldDefinition[] | null;
  createdAt: string;
  updatedAt: string;
  createdByUuid: string | null;
  updatedByUuid: string | null;
}

export type PatientBackgroundData = Omit<
  PatientBackgroundEntity,
  'uuid' | 'patientUuid' | 'createdAt' | 'updatedAt' | 'createdByUuid' | 'updatedByUuid'
>;
