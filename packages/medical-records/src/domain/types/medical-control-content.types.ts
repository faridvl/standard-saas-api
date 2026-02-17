export enum MedicalSpeciality {
  AUDIOLOGY = 'AUDIOLOGY',
  DENTAL = 'DENTAL',
  GENERAL = 'GENERAL',
}

export interface AudiologyFindings {
  otoscopyLeft: string;
  otoscopyRight: string;
  cleaningPerformed: boolean;
  usesAuxiliaries: boolean;
  tinnitus?: boolean;
}

export interface DentalFindings {
  cavitiesCount: number;
  gumHealth: 'GOOD' | 'FAIR' | 'POOR';
}

export type MedicalFindingsMap = {
  [MedicalSpeciality.AUDIOLOGY]: AudiologyFindings;
  [MedicalSpeciality.DENTAL]: DentalFindings;
  [MedicalSpeciality.GENERAL]: Record<string, unknown>;
};
