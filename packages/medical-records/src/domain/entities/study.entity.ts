import { StudyType } from '../types/study.types';

export interface StudyEntity {
  uuid: string;
  encounterUuid: string;
  patientUuid: string;
  tenantUuid: string;
  autorUuid: string;
  tipo: StudyType;
  payload: Record<string, unknown>;
  documentUuid: string | null;
  createdAt: string;
}
