import {
  AudiometryPayloadV1,
  ScreeningPayloadV1,
  ScreeningResult,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { AudiometryEquipment } from '@medical-records/domain/entities/clinic-equipment.entity';

interface PatientAudiometryEntryBase {
  uuid: string;
  patientUuid: string;
  schemaVersion: number;
  typeName: string;
  createdAt: string;
  createdByUuid: string;
  /** Null si identity no pudo resolver el nombre. */
  createdByName: string | null;
  /** Equipo con que se hizo, con la marca y el modelo de ese momento; null en las anteriores a los equipos. */
  equipment: AudiometryEquipment | null;
  /** Marca definitiva de "mal hecha"; todos null si la audiometría sigue vigente. */
  invalidatedAt: string | null;
  invalidatedByUuid: string | null;
  invalidatedByName: string | null;
  invalidationReason: string | null;
}

export interface ClinicalAudiometryEntryEntity extends PatientAudiometryEntryBase {
  typeCode: 'CLINICAL';
  payload: AudiometryPayloadV1;
}

export interface ScreeningAudiometryEntryEntity extends PatientAudiometryEntryBase {
  typeCode: 'SCREENING';
  payload: ScreeningPayloadV1;
}

/** El payload depende del tipo: discriminar por `typeCode` antes de leerlo. */
export type PatientAudiometryEntryEntity =
  | ClinicalAudiometryEntryEntity
  | ScreeningAudiometryEntryEntity;

/** Fila del historial: lo justo para el selector, sin el payload completo. */
export interface PatientAudiometryEntrySummary {
  uuid: string;
  typeCode: string;
  typeName: string;
  createdAt: string;
  createdByUuid: string;
  createdByName: string | null;
  equipment: AudiometryEquipment | null;
  invalidatedAt: string | null;
  invalidatedByUuid: string | null;
  invalidatedByName: string | null;
  invalidationReason: string | null;
  /** Solo rastreo; null en los demás tipos. */
  screeningResult: ScreeningResult | null;
  /** Con qué método y escala se calcularon los PTA y los grados; null si el tipo no los calcula (rastreo). */
  ptaType: AudiometryPayloadV1['summary']['ptaType'] | null;
  gradingScale: AudiometryPayloadV1['summary']['gradingScale'] | null;
  ptaRight: number | null;
  ptaLeft: number | null;
}

interface CreatePatientAudiometryEntryBase {
  tenantUuid: string;
  patientUuid: string;
  createdByUuid: string;
  schemaVersion: number;
  equipmentUuid: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
}

export type CreatePatientAudiometryEntryData = CreatePatientAudiometryEntryBase &
  (
    | { typeCode: 'CLINICAL'; payload: AudiometryPayloadV1 }
    | { typeCode: 'SCREENING'; payload: ScreeningPayloadV1 }
  );

export interface AudiometryTypeItem {
  code: string;
  name: string;
}
