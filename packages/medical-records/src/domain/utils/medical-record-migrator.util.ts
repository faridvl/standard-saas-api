import { MedicalSpeciality, MedicalFindingsMap } from '../types/medical-control-content.types';

type MedicalFindingsData = Record<string, unknown>;

export class MedicalRecordMigrator {
  private static migrations: Record<
    number,
    (data: MedicalFindingsData, spec: MedicalSpeciality) => MedicalFindingsData
  > = {
    1: (data) => data,
  };

  static apply<S extends MedicalSpeciality>(
    data: unknown,
    speciality: S,
    fromVersion: number,
    toVersion: number,
  ): MedicalFindingsMap[S] {
    let migratedData: MedicalFindingsData =
      data && typeof data === 'object' ? (data as MedicalFindingsData) : {};
    for (let v = fromVersion; v < toVersion; v++) {
      if (this.migrations[v]) migratedData = this.migrations[v](migratedData, speciality);
    }
    return migratedData as MedicalFindingsMap[S];
  }
}
