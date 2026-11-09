import { DocumentCategory, Prisma } from '@prisma/client';
import { CreatePatientAudiometryEntryData } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { toClinicDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';

/** Texto de la nota de Control de evolución de una audiometría; el día se lee en hora de Costa Rica. */
export function buildAudiometryNoteText(performedAt: Date): string {
  const [year, month, day] = toClinicDayKey(performedAt).split('-');
  return `Se realizó audiometría el ${day}/${month}/${year}`;
}

/**
 * Datos de la nota de Pruebas de una audiometría. Lleva el mismo `createdAt` que la audiometría:
 * la migración de respaldo usa fecha y texto para no duplicarla.
 */
export function buildAudiometryNoteData(
  entry: CreatePatientAudiometryEntryData,
  createdAt: Date,
): Prisma.PatientNoteUncheckedCreateInput {
  return {
    patientUuid: entry.patientUuid,
    tenantUuid: entry.tenantUuid,
    authorUuid: entry.createdByUuid,
    category: DocumentCategory.EXTERNAL_TEST,
    text: buildAudiometryNoteText(createdAt),
    createdAt,
  };
}
