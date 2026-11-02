import { BadRequestException } from '@nestjs/common';
import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';
import { PatientBackgroundAnswer } from '@medical-records/domain/entities/patient-background.entity';

function isBlank(answer: PatientBackgroundAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return true;
  if (typeof answer === 'string') return answer.trim() === '';
  return false;
}

/**
 * Las respuestas deben corresponder a las preguntas de la sección: ningún id
 * desconocido y todas las obligatorias respondidas. Un `false` es una respuesta.
 */
export function assertAnswersMatchFields(
  fields: ClinicalFieldDefinition[],
  answers: Record<string, PatientBackgroundAnswer>,
): void {
  const knownIds = new Set(fields.map((field) => field.id));
  const unknownIds = Object.keys(answers).filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new BadRequestException(
      `Hay respuestas que no corresponden a la sección: ${unknownIds.join(', ')}`,
    );
  }

  const missing = fields.filter((field) => field.required && isBlank(answers[field.id]));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Faltan respuestas obligatorias: ${missing.map((field) => field.label).join(', ')}`,
    );
  }
}
