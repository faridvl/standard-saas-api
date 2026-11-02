import { BadRequestException } from '@nestjs/common';
import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';
import { PatientBackgroundAnswer } from '@medical-records/domain/entities/patient-background.entity';
import { ANSWER_TEXT_MAX_LENGTH } from '@medical-records/app/dtos/patient-background.dto';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function isBlank(answer: PatientBackgroundAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return true;
  if (typeof answer === 'string') return answer.trim() === '';
  return false;
}

function isValidDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidBoolean(answer: unknown): boolean {
  if (typeof answer === 'boolean') return true;
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return false;
  const { value, detail } = answer as { value?: unknown; detail?: unknown };
  if (typeof value !== 'boolean') return false;
  if (detail === undefined || detail === null) return true;
  return typeof detail === 'string' && detail.length <= ANSWER_TEXT_MAX_LENGTH;
}

function isValidAnswer(field: ClinicalFieldDefinition, answer: unknown): boolean {
  if (field.fieldType === 'boolean') return isValidBoolean(answer);
  if (typeof answer === 'number') return field.fieldType === 'number' && Number.isFinite(answer);
  if (typeof answer !== 'string' || answer.length > ANSWER_TEXT_MAX_LENGTH) return false;
  if (answer.trim() === '') return true;
  if (field.fieldType === 'number') return Number.isFinite(Number(answer));
  if (field.fieldType === 'select') return (field.options ?? []).includes(answer);
  if (field.fieldType === 'date') return isValidDate(answer);
  return true;
}

/**
 * Las respuestas deben corresponder a las preguntas de la sección: ningún id
 * desconocido, cada una con la forma de su tipo, todas las obligatorias
 * respondidas y al menos una con contenido. Un `false` es una respuesta.
 */
export function assertAnswersMatchFields(
  fields: ClinicalFieldDefinition[],
  answers: Record<string, PatientBackgroundAnswer>,
): void {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const hasUnknownIds = Object.keys(answers).some((id) => !fieldsById.has(id));
  if (hasUnknownIds) {
    throw new BadRequestException(
      'Las preguntas de esta sección cambiaron. Vuelve a abrirla para llenar la versión actual.',
    );
  }

  for (const [id, answer] of Object.entries(answers)) {
    const field = fieldsById.get(id);
    if (field && !isValidAnswer(field, answer)) {
      throw new BadRequestException(`La respuesta de "${field.label}" no es válida`);
    }
  }

  const missing = fields.filter((field) => field.required && isBlank(answers[field.id]));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Faltan respuestas obligatorias: ${missing.map((field) => field.label).join(', ')}`,
    );
  }

  if (Object.values(answers).every((answer) => isBlank(answer))) {
    throw new BadRequestException('Responde al menos una pregunta para guardar el registro');
  }
}
