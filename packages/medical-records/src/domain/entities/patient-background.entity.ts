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
  notes: string | null;
  updatedAt: string;
}
