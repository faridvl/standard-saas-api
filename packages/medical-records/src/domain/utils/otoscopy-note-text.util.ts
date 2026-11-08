import { OtoscopyText } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';

/** Texto de la nota de Control de evolución que acompaña a una otoscopia; un oído vacío no lleva línea. */
export function buildOtoscopyNoteText({ otoscopyRight, otoscopyLeft }: OtoscopyText): string {
  const lines = ['Otoscopia'];
  if (otoscopyRight) lines.push(`OD: ${otoscopyRight}`);
  if (otoscopyLeft) lines.push(`OI: ${otoscopyLeft}`);
  return lines.join('\n');
}
