import { MedicalSpeciality, MedicalFindingsMap } from '../types/medical-control-content.types';

export class MedicalRecordMigrator {
  private static migrations: Record<number, (data: any, spec: MedicalSpeciality) => any> = {
    1: (data, spec) => data,
  };

  static apply<S extends MedicalSpeciality>(
    data: unknown,
    speciality: S,
    fromVersion: number,
    toVersion: number,
  ): MedicalFindingsMap[S] {
    let migratedData = (data && typeof data === 'object' ? data : {}) as any;
    for (let v = fromVersion; v < toVersion; v++) {
      if (this.migrations[v]) migratedData = this.migrations[v](migratedData, speciality);
    }
    return migratedData as MedicalFindingsMap[S];
  }
}
