import { BadRequestException } from '@nestjs/common';
import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';

export const QUESTIONNAIRE_NAME_MAX_LENGTH = 60;
export const QUESTIONNAIRE_MAX_FIELDS = 100;
export const QUESTIONNAIRE_LABEL_MAX_LENGTH = 120;

/**
 * Topes de las secciones propias de la clínica. Solo se aplican a la speciality
 * QUESTIONNAIRE: las plantillas de otros productos usan las mismas rutas sin estos límites.
 * Lo que no viene (undefined) no se revisa, para poder actualizar solo una parte.
 */
export function assertValidQuestionnaireTemplate(data: {
  name?: string;
  fields?: ClinicalFieldDefinition[];
}): void {
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 1 || name.length > QUESTIONNAIRE_NAME_MAX_LENGTH) {
      throw new BadRequestException(
        `El nombre de la sección debe tener entre 1 y ${QUESTIONNAIRE_NAME_MAX_LENGTH} caracteres`,
      );
    }
  }

  if (data.fields === undefined) return;

  if (data.fields.length > QUESTIONNAIRE_MAX_FIELDS) {
    throw new BadRequestException(
      `Una sección puede tener hasta ${QUESTIONNAIRE_MAX_FIELDS} preguntas`,
    );
  }

  if (data.fields.some((field) => field.label.length > QUESTIONNAIRE_LABEL_MAX_LENGTH)) {
    throw new BadRequestException(
      `Cada pregunta puede tener hasta ${QUESTIONNAIRE_LABEL_MAX_LENGTH} caracteres`,
    );
  }

  const ids = new Set(data.fields.map((field) => field.id));
  if (ids.size !== data.fields.length) {
    throw new BadRequestException('Hay preguntas repetidas en la sección');
  }
}
