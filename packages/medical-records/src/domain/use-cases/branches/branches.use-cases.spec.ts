import { describe, it, expect } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BranchColor } from '@prisma/client';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import {
  BRANCH_LAST_ACTIVE_CODE,
  BRANCH_NAME_TAKEN_CODE,
} from '@medical-records/domain/utils/branch-name.util';
import { CreateBranchSchema, UpdateBranchSchema } from '@medical-records/app/dtos/branch.dto';
import { CreateBranchUseCase } from './create-branch.use-case';
import { FindAllBranchesUseCase } from './find-all-branches.use-case';
import { UpdateBranchUseCase } from './update-branch.use-case';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';

/** Storage en memoria con la misma regla de clínica que el real: otra clínica no se ve ni se toca. */
function buildStorage(initial: Partial<BranchEntity>[] = []) {
  let nextId = 1;
  const rows: BranchEntity[] = [];
  const add = (data: Partial<BranchEntity>): BranchEntity => {
    const row: BranchEntity = {
      id: nextId++,
      uuid: `uuid-${nextId}`,
      tenantUuid: TENANT,
      name: 'Sede',
      phone: null,
      address: null,
      color: BranchColor.BLUE,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...data,
    };
    rows.push(row);
    return row;
  };
  initial.forEach(add);
  const storage = {
    findAll: (tenantUuid: string) =>
      Promise.resolve(rows.filter((r) => r.tenantUuid === tenantUuid)),
    create: (tenantUuid: string, data: Partial<BranchEntity>) =>
      Promise.resolve(add({ ...data, tenantUuid })),
    update: (tenantUuid: string, uuid: string, data: Partial<BranchEntity>) => {
      const row = rows.find((r) => r.uuid === uuid && r.tenantUuid === tenantUuid);
      if (!row) return Promise.resolve(null);
      Object.assign(row, data);
      return Promise.resolve(row);
    },
  };
  return { storage: storage as unknown as BranchStorage, rows };
}

describe('Sedes: listar', () => {
  it('trae activas e inactivas de la clínica, activas primero y por nombre sin tildes ni mayúsculas', async () => {
    const { storage } = buildStorage([
      { name: 'Zarcero', isActive: false },
      { name: 'Quepos' },
      { name: 'Ángeles' },
      { name: 'cartago' },
      { name: 'Otra clínica', tenantUuid: OTHER_TENANT },
    ]);

    const result = await new FindAllBranchesUseCase(storage).execute(TENANT);

    expect(result.map((b) => b.name)).toEqual(['Ángeles', 'cartago', 'Quepos', 'Zarcero']);
  });
});

describe('Sedes: crear', () => {
  it('guarda la sede de la clínica con teléfono y dirección opcionales', async () => {
    const { storage } = buildStorage();

    const created = await new CreateBranchUseCase(storage).execute(TENANT, {
      name: 'Río Claro',
      color: BranchColor.GREEN,
      phone: '2789-0000',
      address: '  ',
    });

    expect(created).toMatchObject({
      tenantUuid: TENANT,
      name: 'Río Claro',
      color: BranchColor.GREEN,
      phone: '2789-0000',
      address: null,
      isActive: true,
    });
  });

  it.each(['quepos', 'QUEPOS', 'Quépos', ' quepos  '])(
    'rechaza el nombre repetido escrito como "%s" con 409 y código estable',
    async (name) => {
      const { storage } = buildStorage([{ name: 'Quepos' }]);

      const error = await new CreateBranchUseCase(storage)
        .execute(TENANT, { name, color: BranchColor.RED })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: BRANCH_NAME_TAKEN_CODE,
      });
    },
  );

  it('acepta el mismo nombre que tiene otra clínica', async () => {
    const { storage } = buildStorage([{ name: 'Quepos', tenantUuid: OTHER_TENANT }]);

    await expect(
      new CreateBranchUseCase(storage).execute(TENANT, { name: 'Quepos', color: BranchColor.RED }),
    ).resolves.toMatchObject({ name: 'Quepos' });
  });

  it('el nombre repetido incluye a las sedes desactivadas', async () => {
    const { storage } = buildStorage([{ name: 'Quepos', isActive: false }]);

    await expect(
      new CreateBranchUseCase(storage).execute(TENANT, { name: 'quepos', color: BranchColor.RED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Sedes: editar', () => {
  it('cambia nombre y color; conservar su propio nombre con otra mayúscula no es repetido', async () => {
    const { storage } = buildStorage([{ uuid: 'b1', name: 'Quepos', color: BranchColor.YELLOW }]);

    const updated = await new UpdateBranchUseCase(storage).execute(TENANT, 'b1', {
      name: 'QUEPOS Centro',
      color: BranchColor.PURPLE,
    });

    expect(updated).toMatchObject({ name: 'QUEPOS Centro', color: BranchColor.PURPLE });
    await expect(
      new UpdateBranchUseCase(storage).execute(TENANT, 'b1', { name: 'quepos centro' }),
    ).resolves.toMatchObject({ uuid: 'b1' });
  });

  it('rechaza renombrar con el nombre de otra sede de la clínica', async () => {
    const { storage } = buildStorage([
      { uuid: 'b1', name: 'Quepos' },
      { uuid: 'b2', name: 'Uvita' },
    ]);

    await expect(
      new UpdateBranchUseCase(storage).execute(TENANT, 'b2', { name: 'quépos' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([null, '', '   '])('vaciar el teléfono con %p lo guarda como null', async (phone) => {
    const { storage } = buildStorage([{ uuid: 'b1', phone: '2222-2222', address: 'Centro' }]);

    const updated = await new UpdateBranchUseCase(storage).execute(TENANT, 'b1', { phone });

    expect(updated.phone).toBeNull();
    expect(updated.address).toBe('Centro');
  });

  it('desactiva y reactiva sin borrar la sede', async () => {
    const { storage, rows } = buildStorage([{ uuid: 'b1' }, { uuid: 'b2' }]);
    const useCase = new UpdateBranchUseCase(storage);

    expect((await useCase.execute(TENANT, 'b1', { isActive: false })).isActive).toBe(false);
    expect((await useCase.execute(TENANT, 'b1', { isActive: true })).isActive).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it('no deja desactivar la única sede activa: 409 con código y la sede sigue activa', async () => {
    const { storage, rows } = buildStorage([
      { uuid: 'b1' },
      { uuid: 'b2', isActive: false },
      { uuid: 'b3', tenantUuid: OTHER_TENANT },
    ]);

    const error = await new UpdateBranchUseCase(storage)
      .execute(TENANT, 'b1', { isActive: false })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      message: 'No puedes desactivar la única sede activa',
      code: BRANCH_LAST_ACTIVE_CODE,
    });
    expect(rows[0].isActive).toBe(true);
  });

  it('reactivar siempre se permite, aunque no haya ninguna activa', async () => {
    const { storage } = buildStorage([{ uuid: 'b1', isActive: false }]);

    const updated = await new UpdateBranchUseCase(storage).execute(TENANT, 'b1', {
      isActive: true,
    });

    expect(updated.isActive).toBe(true);
  });

  it('desactivar una sede ya inactiva o editarla sin tocar el estado no se bloquea', async () => {
    const { storage } = buildStorage([{ uuid: 'b1' }, { uuid: 'b2', isActive: false }]);
    const useCase = new UpdateBranchUseCase(storage);

    expect((await useCase.execute(TENANT, 'b2', { isActive: false })).isActive).toBe(false);
    expect((await useCase.execute(TENANT, 'b1', { name: 'Nueva' })).name).toBe('Nueva');
  });

  it('una sede de otra clínica responde 404 y no se toca', async () => {
    const { storage, rows } = buildStorage([
      { uuid: 'b1', name: 'Quepos', tenantUuid: OTHER_TENANT },
    ]);

    await expect(
      new UpdateBranchUseCase(storage).execute(TENANT, 'b1', { name: 'Hackeado', isActive: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(rows[0]).toMatchObject({ name: 'Quepos', isActive: true });
  });
});

describe('Sedes: validación del cuerpo', () => {
  const valid = { name: 'Quepos', color: 'RED' };

  it('recorta el nombre y exige entre 1 y 80 caracteres', () => {
    expect(CreateBranchSchema.parse({ ...valid, name: '  Quepos ' }).name).toBe('Quepos');
    expect(CreateBranchSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ ...valid, name: 'a'.repeat(81) }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ ...valid, name: 'a'.repeat(80) }).success).toBe(true);
  });

  it('limita teléfono a 30 y dirección a 200, y acepta null o vacío', () => {
    expect(CreateBranchSchema.safeParse({ ...valid, phone: '1'.repeat(31) }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ ...valid, address: 'a'.repeat(201) }).success).toBe(
      false,
    );
    expect(CreateBranchSchema.safeParse({ ...valid, phone: null, address: '' }).success).toBe(true);
  });

  it('el color es obligatorio al crear y debe ser uno de la paleta', () => {
    expect(CreateBranchSchema.safeParse({ name: 'Quepos' }).success).toBe(false);
    expect(CreateBranchSchema.safeParse({ ...valid, color: 'PINK' }).success).toBe(false);
  });

  it('al editar acepta cuerpo parcial pero no vacío ni con tenantUuid ajeno', () => {
    expect(UpdateBranchSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(UpdateBranchSchema.safeParse({}).success).toBe(false);
    expect(UpdateBranchSchema.parse({ name: 'X', tenantUuid: 'otra' })).not.toHaveProperty(
      'tenantUuid',
    );
  });
});
