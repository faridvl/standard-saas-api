import { AudiometryPayloadV1 } from '@medical-records/app/dtos/patient-audiometry-entry.dto';

export interface PatientAudiometryEntryEntity {
  uuid: string;
  patientUuid: string;
  schemaVersion: number;
  payload: AudiometryPayloadV1;
  createdAt: string;
  createdByUuid: string;
  /** Null si identity no pudo resolver el nombre. */
  createdByName: string | null;
}

/** Fila del historial: lo justo para el selector, sin el payload completo. */
export interface PatientAudiometryEntrySummary {
  uuid: string;
  createdAt: string;
  createdByUuid: string;
  createdByName: string | null;
  /** Con qué método y escala se calcularon los PTA y los grados de este registro. */
  ptaType: AudiometryPayloadV1['summary']['ptaType'];
  gradingScale: AudiometryPayloadV1['summary']['gradingScale'];
  ptaRight: number | null;
  ptaLeft: number | null;
}

export interface CreatePatientAudiometryEntryData {
  tenantUuid: string;
  patientUuid: string;
  createdByUuid: string;
  schemaVersion: number;
  payload: AudiometryPayloadV1;
}
