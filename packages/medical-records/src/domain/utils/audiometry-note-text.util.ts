import { DocumentCategory, Prisma } from '@prisma/client';
import { CreatePatientAudiometryEntryData } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { toClinicDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';

type AudiometryTypeCode = CreatePatientAudiometryEntryData['typeCode'];

/** Cómo se nombra cada tipo dentro de la nota; un tipo nuevo suma una entrada acá. */
export const AUDIOMETRY_NOTE_TYPE_LABEL: Record<AudiometryTypeCode, string> = {
  CLINICAL: 'clínica',
  SCREENING: 'de rastreo',
};

/** Texto de la nota de Control de evolución de una audiometría; el día se lee en hora de Costa Rica. */
export function buildAudiometryNoteText(performedAt: Date, typeCode: AudiometryTypeCode): string {
  const [year, month, day] = toClinicDayKey(performedAt).split('-');
  return `Se realizó audiometría ${AUDIOMETRY_NOTE_TYPE_LABEL[typeCode]} el ${day}/${month}/${year}`;
}

/**
 * Datos de la nota de Pruebas de una audiometría. Lleva el mismo `createdAt` y el uuid de la
 * audiometría, para que Evolución pueda abrirla.
 */
export function buildAudiometryNoteData(
  entry: CreatePatientAudiometryEntryData,
  createdAt: Date,
  audiometryEntryUuid: string,
): Prisma.PatientNoteUncheckedCreateInput {
  return {
    patientUuid: entry.patientUuid,
    tenantUuid: entry.tenantUuid,
    authorUuid: entry.createdByUuid,
    category: DocumentCategory.EXTERNAL_TEST,
    text: buildAudiometryNoteText(createdAt, entry.typeCode),
    audiometryEntryUuid,
    createdAt,
  };
}
