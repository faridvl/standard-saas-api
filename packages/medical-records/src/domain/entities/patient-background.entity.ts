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
  createdAt: string;
  updatedAt: string;
  createdByUuid: string | null;
  updatedByUuid: string | null;
}

export type PatientBackgroundData = Omit<
  PatientBackgroundEntity,
  'uuid' | 'patientUuid' | 'createdAt' | 'updatedAt' | 'createdByUuid' | 'updatedByUuid'
>;
