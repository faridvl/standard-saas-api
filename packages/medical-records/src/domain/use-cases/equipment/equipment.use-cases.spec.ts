import { describe, it, expect } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { EQUIPMENT_ALREADY_EXISTS_CODE } from '@medical-records/domain/utils/equipment.util';
import {
  CreateEquipmentSchema,
  UpdateEquipmentSchema,
} from '@medical-records/app/dtos/equipment.dto';
import { CreateEquipmentUseCase } from './create-equipment.use-case';
import { FindAllEquipmentUseCase } from './find-all-equipment.use-case';
import { UpdateEquipmentUseCase } from './update-equipment.use-case';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';

type Row = EquipmentEntity & { tenantUuid: string };

/** Storage en memoria con la misma regla de clínica que el real: otra clínica no se ve ni se toca. */
function buildStorage(initial: Partial<Row>[] = []) {
  let nextId = 1;
  const rows: Row[] = [];
  const add = (data: Partial<Row>): Row => {
    const row: Row = {
      uuid: `uuid-${nextId++}`,
      tenantUuid: TENANT,
      brand: 'Marca',
      model: 'Modelo',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...data,
    };
    rows.push(row);
    return row;
  };
  initial.forEach(add);
  const view = ({ tenantUuid: _tenant, ...rest }: Row): EquipmentEntity => rest;
  const storage = {
    findAll: (tenantUuid: string) =>
      Promise.resolve(rows.filter((r) => r.tenantUuid === tenantUuid).map(view)),
    create: (tenantUuid: string, data: Partial<Row>) =>
      Promise.resolve(view(add({ ...data, tenantUuid }))),
    update: (tenantUuid: string, uuid: string, data: Partial<Row>) => {
      const row = rows.find((r) => r.uuid === uuid && r.tenantUuid === tenantUuid);
      if (!row) return Promise.resolve(null);
      Object.assign(row, data);
      return Promise.resolve(view(row));
    },
  };
  return { storage: storage as never, rows };
}

describe('Equipos: listar', () => {
  it('devuelve solo los de la clínica, con inactivos, activos primero y por marca y modelo', async () => {
    const { storage } = buildStorage([
      { uuid: 'e1', brand: 'GSI', model: 'Pro', isActive: false },
      { uuid: 'e2', brand: 'Interacoustics', model: 'AD629' },
      { uuid: 'e3', brand: 'Amplivox', model: '270' },
      { uuid: 'e4', brand: 'Ajena', model: 'X', tenantUuid: OTHER_TENANT },
    ]);

    const result = await new FindAllEquipmentUseCase(storage).execute(TENANT);

    expect(result.map((e) => e.uuid)).toEqual(['e3', 'e2', 'e1']);
  });
});

describe('Equipos: crear', () => {
  it('crea activo, en la clínica del JWT', async () => {
    const { storage, rows } = buildStorage();

    const created = await new CreateEquipmentUseCase(storage).execute(TENANT, {
      brand: 'Interacoustics',
      model: 'AD629',
    });

    expect(created).toMatchObject({ brand: 'Interacoustics', model: 'AD629', isActive: true });
    expect(rows[0].tenantUuid).toBe(TENANT);
  });

  it('guarda marca y modelo sin espacios de más', async () => {
    const { storage, rows } = buildStorage();

    await new CreateEquipmentUseCase(storage).execute(TENANT, {
      brand: '  Inter   acoustics ',
      model: ' AD   629 ',
    });

    expect(rows[0]).toMatchObject({ brand: 'Inter acoustics', model: 'AD 629' });
  });

  it('repetir marca y modelo sin distinguir mayúsculas ni espacios da 409 con código', async () => {
    const { storage, rows } = buildStorage([{ brand: 'Interacoustics', model: 'AD629' }]);

    const error = await new CreateEquipmentUseCase(storage)
      .execute(TENANT, { brand: ' interacoustics ', model: 'ad629' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: EQUIPMENT_ALREADY_EXISTS_CODE,
    });
    expect(rows).toHaveLength(1);
  });

  it('también choca con un equipo inactivo', async () => {
    const { storage } = buildStorage([{ brand: 'GSI', model: 'Pro', isActive: false }]);

    await expect(
      new CreateEquipmentUseCase(storage).execute(TENANT, { brand: 'gsi', model: 'PRO' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('la misma marca con otro modelo, o el mismo par en otra clínica, sí se permite', async () => {
    const { storage } = buildStorage([
      { brand: 'GSI', model: 'Pro' },
      { brand: 'Amplivox', model: '270', tenantUuid: OTHER_TENANT },
    ]);
    const useCase = new CreateEquipmentUseCase(storage);

    await expect(useCase.execute(TENANT, { brand: 'GSI', model: 'Pro 2' })).resolves.toBeDefined();
    await expect(
      useCase.execute(TENANT, { brand: 'Amplivox', model: '270' }),
    ).resolves.toBeDefined();
  });
});

describe('Equipos: editar, desactivar y reactivar', () => {
  it('edita marca y modelo', async () => {
    const { storage } = buildStorage([{ uuid: 'e1', brand: 'GSI', model: 'Pro' }]);

    const updated = await new UpdateEquipmentUseCase(storage).execute(TENANT, 'e1', {
      model: 'Pro 2',
    });

    expect(updated).toMatchObject({ brand: 'GSI', model: 'Pro 2' });
  });

  it('al editar guarda marca y modelo normalizados', async () => {
    const { storage, rows } = buildStorage([{ uuid: 'e1', brand: 'Marca', model: 'Modelo' }]);

    await new UpdateEquipmentUseCase(storage).execute(TENANT, 'e1', {
      brand: '  Nueva   marca ',
      model: ' M  2 ',
    });

    expect(rows[0]).toMatchObject({ brand: 'Nueva marca', model: 'M 2' });
  });

  it('no deja quedar igual a otro equipo de la clínica, pero sí a sí mismo', async () => {
    const { storage } = buildStorage([
      { uuid: 'e1', brand: 'GSI', model: 'Pro' },
      { uuid: 'e2', brand: 'Amplivox', model: '270' },
    ]);
    const useCase = new UpdateEquipmentUseCase(storage);

    await expect(
      useCase.execute(TENANT, 'e2', { brand: 'gsi', model: 'pro' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      useCase.execute(TENANT, 'e1', { brand: 'GSI', model: 'PRO' }),
    ).resolves.toBeDefined();
  });

  it('desactiva y reactiva sin borrar', async () => {
    const { storage, rows } = buildStorage([{ uuid: 'e1' }]);
    const useCase = new UpdateEquipmentUseCase(storage);

    expect((await useCase.execute(TENANT, 'e1', { isActive: false })).isActive).toBe(false);
    expect((await useCase.execute(TENANT, 'e1', { isActive: true })).isActive).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it('un equipo de otra clínica responde 404 y no se toca', async () => {
    const { storage, rows } = buildStorage([
      { uuid: 'e1', brand: 'GSI', model: 'Pro', tenantUuid: OTHER_TENANT },
    ]);

    await expect(
      new UpdateEquipmentUseCase(storage).execute(TENANT, 'e1', {
        brand: 'Hackeado',
        isActive: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(rows[0]).toMatchObject({ brand: 'GSI', isActive: true });
  });
});

describe('Equipos: validación del cuerpo', () => {
  it('marca y modelo son obligatorios, se recortan y tienen largo máximo', () => {
    expect(CreateEquipmentSchema.parse({ brand: ' GSI ', model: ' Pro ' })).toEqual({
      brand: 'GSI',
      model: 'Pro',
    });
    expect(CreateEquipmentSchema.safeParse({ brand: 'GSI' }).success).toBe(false);
    expect(CreateEquipmentSchema.safeParse({ brand: '   ', model: 'Pro' }).success).toBe(false);
    expect(CreateEquipmentSchema.safeParse({ brand: 'a'.repeat(81), model: 'Pro' }).success).toBe(
      false,
    );
  });

  it('al editar acepta cuerpo parcial pero no vacío ni con tenantUuid ajeno', () => {
    expect(UpdateEquipmentSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(UpdateEquipmentSchema.safeParse({}).success).toBe(false);
    expect(UpdateEquipmentSchema.parse({ brand: 'X', tenantUuid: 'otra' })).not.toHaveProperty(
      'tenantUuid',
    );
  });
});
