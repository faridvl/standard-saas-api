import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UpdateClinicalTemplateUseCase } from './update-clinical-template.use-case';
import { CreateClinicalTemplateUseCase } from './create-clinical-template.use-case';
import {
  ClinicalFieldDefinition,
  ClinicalTemplateEntity,
} from '@medical-records/domain/entities/clinical-template.entity';

const TENANT = 'tenant-1';

function field(id: string, label = 'Pregunta'): ClinicalFieldDefinition {
  return { id, label, fieldType: 'text', required: false, order: 1 };
}

function buildTemplate(speciality: string): ClinicalTemplateEntity {
  return {
    uuid: 'template-1',
    tenantUuid: TENANT,
    name: 'Hábitos',
    speciality,
    fields: [field('a')],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('plantillas clínicas: secciones QUESTIONNAIRE', () => {
  let existing: ClinicalTemplateEntity;
  let updates: unknown[];
  let creates: unknown[];
  let update: UpdateClinicalTemplateUseCase;
  let create: CreateClinicalTemplateUseCase;

  beforeEach(() => {
    existing = buildTemplate('QUESTIONNAIRE');
    updates = [];
    creates = [];
    const storage = {
      findByUuid: () => Promise.resolve(existing),
      update: (_uuid: string, _tenant: string, dto: unknown) => {
        updates.push(dto);
        return Promise.resolve(existing);
      },
      create: (_tenant: string, dto: unknown) => {
        creates.push(dto);
        return Promise.resolve(existing);
      },
    };
    update = new UpdateClinicalTemplateUseCase(storage as never);
    create = new CreateClinicalTemplateUseCase(storage as never);
  });

  describe('cambio de speciality', () => {
    it('no deja pasar una sección QUESTIONNAIRE a otra speciality', async () => {
      await expect(
        update.execute('template-1', TENANT, { speciality: 'AUDIOLOGY' }),
      ).rejects.toThrow(BadRequestException);
      expect(updates).toHaveLength(0);
    });

    it('no deja convertir otra plantilla en QUESTIONNAIRE ni en la historia clínica', async () => {
      existing = buildTemplate('AUDIOLOGY');
      await expect(
        update.execute('template-1', TENANT, { speciality: 'QUESTIONNAIRE' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        update.execute('template-1', TENANT, { speciality: 'CLINICAL_HISTORY' }),
      ).rejects.toThrow(BadRequestException);
      expect(updates).toHaveLength(0);
    });

    it('no deja cambiar la speciality de la historia clínica', async () => {
      existing = buildTemplate('CLINICAL_HISTORY');
      await expect(
        update.execute('template-1', TENANT, { speciality: 'QUESTIONNAIRE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite repetir la misma speciality y cambiar entre las que no son clínicas', async () => {
      await update.execute('template-1', TENANT, { speciality: 'QUESTIONNAIRE' });
      existing = buildTemplate('AUDIOLOGY');
      await update.execute('template-1', TENANT, { speciality: 'OTHER' });
      expect(updates).toHaveLength(2);
    });
  });

  describe('topes de una sección', () => {
    it('rechaza un nombre vacío o de más de 60 caracteres', async () => {
      await expect(update.execute('template-1', TENANT, { name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        create.execute(TENANT, {
          name: 'x'.repeat(61),
          speciality: 'QUESTIONNAIRE',
          fields: [field('a')],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza más de 100 preguntas', async () => {
      const fields = Array.from({ length: 101 }, (_, index) => field(`q${index}`));
      await expect(
        create.execute(TENANT, { name: 'Hábitos', speciality: 'QUESTIONNAIRE', fields }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una pregunta de más de 120 caracteres', async () => {
      await expect(
        update.execute('template-1', TENANT, { fields: [field('a', 'x'.repeat(121))] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza ids de pregunta repetidos', async () => {
      await expect(
        create.execute(TENANT, {
          name: 'Hábitos',
          speciality: 'QUESTIONNAIRE',
          fields: [field('a'), field('a')],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(creates).toHaveLength(0);
    });

    it('no aplica los topes a otras speciality (Zynka)', async () => {
      existing = buildTemplate('AUDIOLOGY');
      const fields = Array.from({ length: 150 }, (_, index) => field('dup', `p${index}`));
      await create.execute(TENANT, { name: 'x'.repeat(200), speciality: 'AUDIOLOGY', fields });
      await update.execute('template-1', TENANT, { fields });
      expect(creates).toHaveLength(1);
      expect(updates).toHaveLength(1);
    });
  });
});
