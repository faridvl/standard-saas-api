export enum MedicalSpeciality {
  AUDIOLOGY = 'AUDIOLOGY',
  DENTAL = 'DENTAL',
  GENERAL = 'GENERAL',
}

export interface AudiogramPoint {
  hz: number;
  db: number;
  x: number;
  y: number;
}

export interface AudiogramData {
  OD: Record<string, string>;
  OI: Record<string, string>;
}

export interface AudiologyFindings {
  otoscopyLeft: string;
  otoscopyRight: string;
  cleaningPerformed: boolean;
  usesAuxiliaries: boolean;
  tinnitus?: boolean;
  audiogram?: AudiogramData;
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
