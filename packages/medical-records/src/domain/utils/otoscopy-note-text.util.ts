import { DocumentCategory, Prisma } from '@prisma/client';
import {
  CreatePatientOtoscopyEntryData,
  OtoscopyText,
} from '@medical-records/domain/entities/patient-otoscopy-entry.entity';

/** Texto de la nota de Control de evolución que acompaña a una otoscopia; un oído vacío no lleva línea. */
export function buildOtoscopyNoteText({ otoscopyRight, otoscopyLeft }: OtoscopyText): string {
  const lines = ['Otoscopia'];
  if (otoscopyRight) lines.push(`OD: ${otoscopyRight}`);
  if (otoscopyLeft) lines.push(`OI: ${otoscopyLeft}`);
  return lines.join('\n');
}

/**
 * Datos de la nota de Pruebas de una otoscopia. Lleva el mismo `createdAt` que la otoscopia:
 * la migración de respaldo usa fecha y texto para no duplicarla.
 */
export function buildOtoscopyNoteData(
  entry: CreatePatientOtoscopyEntryData,
  createdAt: Date,
): Prisma.PatientNoteUncheckedCreateInput {
  return {
    patientUuid: entry.patientUuid,
    tenantUuid: entry.tenantUuid,
    authorUuid: entry.createdByUuid,
    category: DocumentCategory.EXTERNAL_TEST,
    text: buildOtoscopyNoteText(entry),
    createdAt,
  };
}
