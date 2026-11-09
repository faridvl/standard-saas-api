import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { assertAnswersMatchFields } from './questionnaire-answers.util';
import { ClinicalFieldDefinition } from '@medical-records/domain/entities/clinical-template.entity';

const fields: ClinicalFieldDefinition[] = [
  { id: 'fuma', label: 'Fuma', fieldType: 'boolean', required: false, order: 1 },
  { id: 'notas', label: 'Notas', fieldType: 'textarea', required: false, order: 2 },
  { id: 'horas', label: 'Horas', fieldType: 'number', required: false, order: 3 },
  {
    id: 'lado',
    label: 'Lado',
    fieldType: 'select',
    required: false,
    options: ['Derecho', 'Izquierdo'],
    order: 4,
  },
  { id: 'cuando', label: 'Cuándo', fieldType: 'date', required: false, order: 5 },
];

const run = (answers: Record<string, unknown>) => () =>
  assertAnswersMatchFields(fields, answers as never);

describe('assertAnswersMatchFields', () => {
  it('rechaza un registro con todas las respuestas vacías', () => {
    expect(run({})).toThrow(BadRequestException);
    expect(run({ notas: '   ', horas: '' })).toThrow(BadRequestException);
  });

  it('un false en un Sí/No cuenta como contenido', () => {
    expect(run({ fuma: false })).not.toThrow();
    expect(run({ fuma: { value: false, detail: null } })).not.toThrow();
  });

  it('valida la forma según el tipo de pregunta', () => {
    expect(run({ fuma: 'sí' })).toThrow(BadRequestException);
    expect(run({ fuma: { value: 'sí' } })).toThrow(BadRequestException);
    expect(run({ fuma: { value: true, detail: 3 } })).toThrow(BadRequestException);
    expect(run({ fuma: { value: true, detail: 'diez al día' } })).not.toThrow();
    expect(run({ notas: true })).toThrow(BadRequestException);
    expect(run({ horas: 'muchas' })).toThrow(BadRequestException);
    expect(run({ horas: '7.5' })).not.toThrow();
    expect(run({ lado: 'Arriba' })).toThrow(BadRequestException);
    expect(run({ lado: 'Derecho' })).not.toThrow();
    expect(run({ cuando: 'ayer' })).toThrow(BadRequestException);
    expect(run({ cuando: '2026-11-01' })).not.toThrow();
  });

  it('rechaza respuestas de más de 1000 caracteres', () => {
    expect(run({ notas: 'x'.repeat(1001) })).toThrow(BadRequestException);
  });

  it('el aviso por ids que no corresponden no muestra ids', () => {
    expect(() => assertAnswersMatchFields(fields, { inventado: 'x' })).toThrow(
      'Las preguntas de esta sección cambiaron. Vuelve a abrirla para llenar la versión actual.',
    );
  });
});
