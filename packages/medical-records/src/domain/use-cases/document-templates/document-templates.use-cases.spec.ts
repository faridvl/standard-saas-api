import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentTemplateBodySchema } from '@medical-records/app/dtos/document-template.dto';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';
import {
  DocumentTemplateEntity,
  DocumentTemplateWriteData,
} from '@medical-records/domain/entities/document-template.entity';
import { CreateDocumentTemplateUseCase } from './create-document-template.use-case';
import { UpdateDocumentTemplateUseCase } from './update-document-template.use-case';
import { FindDocumentTemplateUseCase } from './find-document-template.use-case';
import { FindDocumentTemplatesUseCase } from './find-document-templates.use-case';

interface StoredTemplate extends DocumentTemplateEntity {
  tenantUuid: string;
}

class FakeDocumentTemplateStorage extends DocumentTemplateStorage {
  rows: StoredTemplate[] = [];

  constructor() {
    super(null as never);
  }

  private strip({ tenantUuid: _tenantUuid, ...entity }: StoredTemplate): DocumentTemplateEntity {
    return entity;
  }

  findAll(tenantUuid: string): Promise<DocumentTemplateEntity[]> {
    const rows = this.rows
      .filter((row) => row.tenantUuid === tenantUuid)
      .map((row) => this.strip(row));
    return Promise.resolve(rows);
  }

  findByUuid(uuid: string, tenantUuid: string): Promise<DocumentTemplateEntity | null> {
    const row = this.rows.find((r) => r.uuid === uuid && r.tenantUuid === tenantUuid);
    return Promise.resolve(row ? this.strip(row) : null);
  }

  nameExists(tenantUuid: string, name: string, exceptUuid?: string): Promise<boolean> {
    return Promise.resolve(
      this.rows.some(
        (r) =>
          r.tenantUuid === tenantUuid &&
          r.uuid !== exceptUuid &&
          r.name.toLowerCase() === name.toLowerCase(),
      ),
    );
  }

  create(
    tenantUuid: string,
    _actorUuid: string,
    data: DocumentTemplateWriteData,
  ): Promise<DocumentTemplateEntity> {
    const now = new Date().toISOString();
    const row: StoredTemplate = {
      uuid: `uuid-${this.rows.length + 1}`,
      tenantUuid,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return Promise.resolve(this.strip(row));
  }

  update(
    uuid: string,
    tenantUuid: string,
    _actorUuid: string,
    data: DocumentTemplateWriteData,
  ): Promise<DocumentTemplateEntity | null> {
    const row = this.rows.find((r) => r.uuid === uuid && r.tenantUuid === tenantUuid);
    if (!row) return Promise.resolve(null);
    Object.assign(row, data, { updatedAt: new Date().toISOString() });
    return Promise.resolve(this.strip(row));
  }
}

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const ACTOR = 'user-1';

describe('Plantillas de documento', () => {
  let storage: FakeDocumentTemplateStorage;
  let create: CreateDocumentTemplateUseCase;
  let update: UpdateDocumentTemplateUseCase;
  let findOne: FindDocumentTemplateUseCase;
  let findAll: FindDocumentTemplatesUseCase;

  beforeEach(() => {
    storage = new FakeDocumentTemplateStorage();
    create = new CreateDocumentTemplateUseCase(storage);
    update = new UpdateDocumentTemplateUseCase(storage);
    findOne = new FindDocumentTemplateUseCase(storage);
    findAll = new FindDocumentTemplatesUseCase(storage);
  });

  it('crea una plantilla con variables permitidas', async () => {
    const created = await create.execute(TENANT_A, ACTOR, {
      name: 'Consentimiento',
      description: 'Antes de la prueba',
      content: 'Yo {{ nombre_completo }}, documento {{documento}}',
    });

    expect(created.uuid).toBeDefined();
    expect(created.description).toBe('Antes de la prueba');
    expect(await findOne.execute(created.uuid, TENANT_A)).toEqual(created);
  });

  it('acepta las variables de otoscopia, diagnóstico y clínica', async () => {
    const created = await create.execute(TENANT_A, ACTOR, {
      name: 'Informe con clínica',
      content:
        '{{clinica_nombre}} {{clinica_telefono}} {{clinica_correo}} {{clinica_direccion}} ' +
        '{{otoscopia_od}} {{otoscopia_oi}} {{diagnostico}} {{observaciones}}',
    });

    expect(created.content).toContain('{{clinica_telefono}}');
  });

  it('guarda null cuando la descripción viene vacía o null', async () => {
    const created = await create.execute(TENANT_A, ACTOR, {
      name: 'A',
      description: '',
      content: 'x',
    });
    expect(created.description).toBeNull();

    const fromNull = await create.execute(TENANT_A, ACTOR, {
      name: 'B',
      description: null,
      content: 'x',
    });
    expect(fromNull.description).toBeNull();
  });

  it('un nombre con guion bajo solo choca con su mismo texto sin importar mayúsculas', async () => {
    await create.execute(TENANT_A, ACTOR, { name: 'Informe_A', content: 'a' });

    await expect(
      create.execute(TENANT_A, ACTOR, { name: 'InformeXA', content: 'b' }),
    ).resolves.toBeDefined();
    await expect(
      create.execute(TENANT_A, ACTOR, { name: 'informe_a', content: 'c' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('el contenido es requerido y no puede ser solo espacios', () => {
    const base = { name: 'A', description: null };
    const accepts = (content?: string) =>
      DocumentTemplateBodySchema.safeParse({ ...base, content }).success;

    expect(accepts('')).toBe(false);
    expect(accepts(' \n\t ')).toBe(false);
    expect(accepts(undefined)).toBe(false);
    expect(accepts(' hola ')).toBe(true);
  });

  it('la descripción acepta omitida, vacía o null', () => {
    const base = { name: 'A', content: 'x' };
    expect(DocumentTemplateBodySchema.safeParse(base).success).toBe(true);
    expect(DocumentTemplateBodySchema.safeParse({ ...base, description: '' }).success).toBe(true);
    expect(DocumentTemplateBodySchema.safeParse({ ...base, description: null }).success).toBe(true);
  });

  it('rechaza un nombre repetido sin distinguir mayúsculas con 409', async () => {
    await create.execute(TENANT_A, ACTOR, { name: 'Consentimiento', content: 'a' });

    await expect(
      create.execute(TENANT_A, ACTOR, { name: 'CONSENTIMIENTO', content: 'b' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite el mismo nombre en otra clínica', async () => {
    await create.execute(TENANT_A, ACTOR, { name: 'Consentimiento', content: 'a' });

    await expect(
      create.execute(TENANT_B, ACTOR, { name: 'Consentimiento', content: 'a' }),
    ).resolves.toBeDefined();
  });

  it('rechaza variables desconocidas con 400 y las nombra', async () => {
    const attempt = create.execute(TENANT_A, ACTOR, {
      name: 'Mala',
      content: 'Hola {{nombre}} {{ cedula }} {{peso}} {{cedula}}',
    });

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toThrow(/\{\{cedula\}\}, \{\{peso\}\}/);
    expect(storage.rows).toHaveLength(0);
  });

  it('edita una plantilla y permite conservar su propio nombre', async () => {
    const created = await create.execute(TENANT_A, ACTOR, { name: 'Consentimiento', content: 'a' });

    const updated = await update.execute(created.uuid, TENANT_A, ACTOR, {
      name: 'Consentimiento',
      description: 'Nueva',
      content: 'Hola {{nombre}}',
    });

    expect(updated.content).toBe('Hola {{nombre}}');
    expect(updated.description).toBe('Nueva');
  });

  it('al editar rechaza el nombre de otra plantilla con 409 y variables desconocidas con 400', async () => {
    await create.execute(TENANT_A, ACTOR, { name: 'Uno', content: 'a' });
    const second = await create.execute(TENANT_A, ACTOR, { name: 'Dos', content: 'b' });

    await expect(
      update.execute(second.uuid, TENANT_A, ACTOR, { name: 'uno', content: 'b' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      update.execute(second.uuid, TENANT_A, ACTOR, { name: 'Dos', content: '{{x}}' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('otra clínica no puede leer ni editar la plantilla (404)', async () => {
    const created = await create.execute(TENANT_A, ACTOR, { name: 'Privada', content: 'secreto' });

    await expect(findOne.execute(created.uuid, TENANT_B)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      update.execute(created.uuid, TENANT_B, ACTOR, { name: 'Hackeada', content: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect((await findOne.execute(created.uuid, TENANT_A)).content).toBe('secreto');
    expect(await findAll.execute(TENANT_B)).toEqual([]);
  });

  it('ordena sin distinguir mayúsculas ni tildes: acta antes que Zeta y Árbol con la A', async () => {
    for (const name of ['Zeta', 'Árbol', 'acta', 'Beta']) {
      await create.execute(TENANT_A, ACTOR, { name, content: 'x' });
    }

    const list = await findAll.execute(TENANT_A);
    expect(list.map((t) => t.name)).toEqual(['acta', 'Árbol', 'Beta', 'Zeta']);
  });

  it('lista solo las de la clínica, ordenadas por nombre', async () => {
    await create.execute(TENANT_A, ACTOR, { name: 'Zeta', content: 'x' });
    await create.execute(TENANT_A, ACTOR, { name: 'Alfa', content: 'x' });
    await create.execute(TENANT_B, ACTOR, { name: 'Otra', content: 'x' });

    const list = await findAll.execute(TENANT_A);
    expect(list.map((t) => t.name)).toEqual(['Alfa', 'Zeta']);
  });
});
