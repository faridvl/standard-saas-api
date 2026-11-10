/* eslint-disable @typescript-eslint/require-await -- el fake imita una API asíncrona */
import { describe, it, expect } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import {
  Specialty,
  UserActor,
  UserAuditChange,
  UserAuditEntry,
  UserAuditField,
  UserDomain,
  UserRole,
  UserStatus,
  UserStatusFilter,
} from '../../types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { BcryptService } from '../../../infrastructure/security/bcrypt.service';
import { CreateUserUseCase } from '../user.use-case';
import { UpdateUserUseCase } from './update-user.use-case';
import { SetUserStatusUseCase } from './set-user-status.use-case';
import { DeleteUserUseCase } from './delete-user.use-case';
import { ResetUserPasswordUseCase } from './reset-user-password.use-case';
import { GetUsersUseCase, USERS_LIST_MAX_LIMIT } from './get-users.use-case';
import { GetUserAuditUseCase } from './get-user-audit.use-case';
import { ZodValidationPipe } from '@project/core';
import { CreateUserSchema } from '../../dtos/create-user.dto';
import { UpdateUserSchema } from '../../dtos/update-user.dto';
import { RegisterTenantSchema } from '../../dtos/register-tenant.dto';
import { LoginUseCase } from '../login.use-case';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';
const PASSWORD = 'Temporal1';

type Row = UserDomain & { password: string };

const row = (uuid: string, role: UserRole, overrides: Partial<Row> = {}): Row => ({
  uuid,
  email: `${uuid}@clinica.test`,
  fullName: uuid,
  role,
  tenantId: 1,
  tenantUUID: TENANT,
  attendsPatients: false,
  specialties: [],
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-01-01'),
  password: 'hash',
  ...overrides,
});

/** Storage en memoria con las mismas reglas de filtro por clínica que el real. */
class FakeUserStorage {
  rows: Row[];
  audit: (UserAuditChange & { targetUuid: string })[] = [];

  constructor(rows: Row[]) {
    this.rows = rows;
  }

  private find(uuid: string, tenant: string): Row | undefined {
    return this.rows.find((r) => r.uuid === uuid && r.tenantUUID === tenant);
  }

  async findByEmail(email: string): Promise<User | null> {
    const r = this.rows.find((x) => x.email === email.trim().toLowerCase());
    if (!r) return null;
    return {
      id: 1,
      uuid: r.uuid,
      email: r.email,
      name: r.fullName,
      password: r.password,
      role: r.role,
      status: r.status,
      tenantId: r.tenantId,
      tenantUuid: r.tenantUUID ?? '',
      attendsPatients: r.attendsPatients,
      specialties: r.specialties,
      professionalTitle: r.professionalTitle,
      licenseNumber: r.licenseNumber,
    };
  }

  async findByUuidAndTenant(uuid: string, tenant: string): Promise<UserDomain | null> {
    return this.find(uuid, tenant) ?? null;
  }

  async save(data: Omit<Row, 'uuid' | 'createdAt'>, audit: UserAuditChange[]): Promise<UserDomain> {
    const created = { ...data, uuid: `new-${this.rows.length}`, createdAt: new Date() } as Row;
    this.rows.push(created);
    this.audit.push(...audit.map((a) => ({ ...a, targetUuid: created.uuid })));
    return created;
  }

  async update(uuid: string, data: Partial<Row>, audit: UserAuditChange[]): Promise<UserDomain> {
    const target = this.rows.find((r) => r.uuid === uuid) as Row;
    Object.assign(target, data);
    this.audit.push(...audit.map((a) => ({ ...a, targetUuid: uuid })));
    return target;
  }

  async updateStatus(uuid: string, status: UserStatus): Promise<void> {
    (this.rows.find((r) => r.uuid === uuid) as Row).status = status;
  }

  async updatePassword(uuid: string, hashed: string, audit: UserAuditChange[] = []): Promise<void> {
    (this.rows.find((r) => r.uuid === uuid) as Row).password = hashed;
    this.audit.push(...audit.map((a) => ({ ...a, targetUuid: uuid })));
  }

  async countActiveOwners(tenant: string, excluding?: string): Promise<number> {
    return this.rows.filter(
      (r) =>
        r.tenantUUID === tenant &&
        r.role === UserRole.OWNER &&
        r.status === UserStatus.ACTIVE &&
        r.uuid !== excluding,
    ).length;
  }

  async findAllByTenant(tenant: string, page: number, limit: number, filter: UserStatusFilter) {
    const data = this.rows.filter(
      (r) =>
        r.tenantUUID === tenant &&
        (filter === UserStatusFilter.ALL || String(r.status) === String(filter)),
    );
    return { data, meta: { total: data.length, page, limit, totalPages: 1 } };
  }

  async findAuditByTenant(tenant: string, page: number, limit: number) {
    const data = this.audit as unknown as UserAuditEntry[];
    return { data, meta: { total: data.length, page, limit, totalPages: 1 } };
  }
}

const actorOf = (uuid: string, role: UserRole): UserActor => ({
  uuid,
  role,
  tenantId: 1,
  tenantUuid: TENANT,
});

const build = (extra: Row[] = []) => {
  const storage = new FakeUserStorage([
    row('recep', UserRole.RECEPTION),
    row('admin', UserRole.ADMIN),
    row('owner', UserRole.OWNER, { attendsPatients: true, specialties: [Specialty.AUDIOLOGY] }),
    row('owner2', UserRole.OWNER),
    row('recep2', UserRole.RECEPTION),
    row('admin2', UserRole.ADMIN),
    row('foreign', UserRole.RECEPTION, { tenantUUID: OTHER_TENANT, tenantId: 2 }),
    ...extra,
  ]);
  const asStorage = storage as unknown as UserStorage;
  const setStatus = new SetUserStatusUseCase(asStorage);
  return {
    storage,
    create: new CreateUserUseCase(asStorage),
    update: new UpdateUserUseCase(asStorage),
    setStatus,
    remove: new DeleteUserUseCase(setStatus),
    reset: new ResetUserPasswordUseCase(asStorage),
    list: new GetUsersUseCase(asStorage),
    audit: new GetUserAuditUseCase(asStorage),
  };
};

const actors = {
  RECEPTION: actorOf('recep', UserRole.RECEPTION),
  ADMIN: actorOf('admin', UserRole.ADMIN),
  OWNER: actorOf('owner', UserRole.OWNER),
};
type Level = keyof typeof actors;

const newUser = (overrides: Record<string, unknown> = {}) =>
  CreateUserSchema.parse({
    email: 'nuevo@clinica.test',
    fullName: 'Nuevo',
    password: PASSWORD,
    ...overrides,
  });

type Case = {
  name: string;
  run: (ctx: ReturnType<typeof build>, actor: UserActor) => Promise<unknown>;
  expected: Record<Level, 'ok' | 403>;
};

const MATRIX: Case[] = [
  {
    name: 'listar usuarios',
    run: (c, a) => c.list.execute(a),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'crear RECEPTION',
    run: (c, a) => c.create.execute(newUser({ role: 'RECEPTION' }), a),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'crear ADMIN',
    run: (c, a) => c.create.execute(newUser({ role: 'ADMIN' }), a),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'crear con atiende pacientes',
    run: (c, a) => c.create.execute(newUser({ attendsPatients: true, specialties: ['ENT'] }), a),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'crear OWNER',
    run: (c, a) => c.create.execute(newUser({ role: 'OWNER' }), a),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'cambiar el nivel de otro a ADMIN',
    run: (c, a) => c.update.execute('recep2', a, { role: UserRole.ADMIN }),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'dar OWNER a otro',
    run: (c, a) => c.update.execute('recep2', a, { role: UserRole.OWNER }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'activar atiende pacientes a otro',
    run: (c, a) =>
      c.update.execute('recep2', a, { attendsPatients: true, specialties: [Specialty.ENT] }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'activar atiende pacientes en sí mismo',
    run: (c, a) =>
      c.update.execute(a.uuid, a, { attendsPatients: true, specialties: [Specialty.ENT] }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'cambiar especialidades de otro',
    run: (c, a) => c.update.execute('owner', a, { specialties: [Specialty.ENT] }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'desactivar a un RECEPTION',
    run: (c, a) => c.setStatus.execute('recep2', UserStatus.INACTIVE, a),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'poner contraseña a un RECEPTION',
    run: (c, a) => c.reset.execute('recep2', PASSWORD, a),
    expected: { RECEPTION: 403, ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'tocar a un OWNER (desactivar)',
    run: (c, a) => c.setStatus.execute('owner2', UserStatus.INACTIVE, a),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'tocar a un OWNER (contraseña)',
    run: (c, a) => c.reset.execute('owner2', PASSWORD, a),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'editar el nombre de un OWNER',
    run: (c, a) => c.update.execute('owner2', a, { fullName: 'Otro' }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 'ok' },
  },
  {
    name: 'editar su propio título y colegiado',
    run: (c, a) =>
      c.update.execute(a.uuid, a, { professionalTitle: 'LIC', licenseNumber: 'C-1234' } as never),
    expected: { RECEPTION: 'ok', ADMIN: 'ok', OWNER: 'ok' },
  },
  {
    name: 'editar el título de otra persona',
    run: (c, a) => c.update.execute('recep2', a, { professionalTitle: 'DR' } as never),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 403 },
  },
  {
    name: 'editar el colegiado de otra persona',
    run: (c, a) => c.update.execute('recep2', a, { licenseNumber: 'C-99' }),
    expected: { RECEPTION: 403, ADMIN: 403, OWNER: 403 },
  },
];

describe('usuarios: matriz de nivel de acceso por acción', () => {
  for (const testCase of MATRIX) {
    for (const level of Object.keys(actors) as Level[]) {
      const expected = testCase.expected[level];
      it(`${level} / ${testCase.name} -> ${expected}`, async () => {
        const ctx = build();
        const outcome = await testCase.run(ctx, actors[level]).then(
          () => 'ok',
          (error: unknown) => (error instanceof ForbiddenException ? 403 : String(error)),
        );
        expect(outcome).toBe(expected);
      });
    }
  }
});

describe('usuarios: reglas puntuales', () => {
  it('atiende pacientes sin especialidad se rechaza al validar (400)', () => {
    expect(() => newUser({ attendsPatients: true, specialties: [] })).toThrow();
    const pipe = new ZodValidationPipe(CreateUserSchema);
    expect(() =>
      pipe.transform(
        { email: 'a@b.test', fullName: 'A', password: PASSWORD, attendsPatients: true },
        { type: 'body' },
      ),
    ).toThrow(BadRequestException);
  });

  it('una especialidad fuera del catálogo se rechaza (400)', () => {
    const pipe = new ZodValidationPipe(CreateUserSchema);
    expect(() =>
      pipe.transform(
        {
          email: 'a@b.test',
          fullName: 'A',
          password: PASSWORD,
          attendsPatients: true,
          specialties: ['ASTROLOGY'],
        },
        { type: 'body' },
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      new ZodValidationPipe(UpdateUserSchema).transform({ specialties: ['X'] }, { type: 'body' }),
    ).toThrow(BadRequestException);
  });

  it('el texto libre specialty ya no existe y el registro exige especialidades del catálogo', () => {
    const base = {
      businessName: 'Clínica',
      ownerName: 'Ana',
      email: 'ana@clinica.test',
      password: PASSWORD,
    };
    expect(RegisterTenantSchema.safeParse({ ...base, isSpecialist: true }).success).toBe(false);
    expect(
      RegisterTenantSchema.safeParse({ ...base, isSpecialist: true, specialties: ['ENT'] }).success,
    ).toBe(true);
  });

  it('apagar atiende pacientes vacía las especialidades', async () => {
    const ctx = build();
    const updated = await ctx.update.execute('owner', actors.OWNER, { attendsPatients: false });
    expect(updated.attendsPatients).toBe(false);
    expect(updated.specialties).toEqual([]);
  });

  it('activar atiende pacientes sin especialidad se rechaza (400)', async () => {
    const ctx = build();
    await expect(
      ctx.update.execute('recep2', actors.OWNER, { attendsPatients: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('la clínica no queda sin OWNER activo (400)', async () => {
    const ctx = build();
    // Con un actor OWNER activo siempre queda al menos él: la regla se prueba directo sobre la política.
    ctx.storage.rows.find((r) => r.uuid === 'owner2')!.status = UserStatus.INACTIVE;
    const { assertTenantKeepsOwner } = await import('../../policies/user-admin.policy');
    await expect(
      assertTenantKeepsOwner(ctx.storage as unknown as UserStorage, TENANT, 'owner'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      assertTenantKeepsOwner(ctx.storage as unknown as UserStorage, TENANT, 'owner2'),
    ).resolves.toBeUndefined();
  });

  it('nadie cambia su propio nivel ni su propio estado', async () => {
    const ctx = build();
    await expect(
      ctx.update.execute('owner', actors.OWNER, { role: UserRole.ADMIN }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      ctx.update.execute('admin', actors.ADMIN, { role: UserRole.OWNER }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      ctx.setStatus.execute('owner', UserStatus.INACTIVE, actors.OWNER),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctx.remove.execute('admin', actors.ADMIN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reenviar el mismo nivel o los mismos datos no cuenta como cambio', async () => {
    const ctx = build();
    await expect(
      ctx.update.execute('admin', actors.ADMIN, {
        role: UserRole.ADMIN,
        attendsPatients: false,
        specialties: [],
        fullName: 'Admin',
      }),
    ).resolves.toBeDefined();
    expect(ctx.storage.audit).toHaveLength(0);
  });

  it('otra clínica responde 404 en todas las acciones sobre un usuario ajeno', async () => {
    const ctx = build();
    const owner = actors.OWNER;
    await expect(ctx.update.execute('foreign', owner, { fullName: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      ctx.setStatus.execute('foreign', UserStatus.INACTIVE, owner),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.reset.execute('foreign', PASSWORD, owner)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(ctx.remove.execute('foreign', owner)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el listado solo trae la clínica del actor y limita la página', async () => {
    const ctx = build();
    const page = await ctx.list.execute(actors.ADMIN, 1, 5000);
    expect(page.data.every((u) => u.tenantUUID === TENANT)).toBe(true);
    expect(page.meta.limit).toBe(USERS_LIST_MAX_LIMIT);
    await expect(ctx.list.execute(actors.ADMIN, 1, 10, 'otro')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('un actor desactivado después de emitir su token pierde el acceso', async () => {
    const ctx = build();
    ctx.storage.rows.find((r) => r.uuid === 'admin')!.status = UserStatus.INACTIVE;
    await expect(ctx.list.execute(actors.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un nivel bajado después de emitir el token se respeta (se relee de la base)', async () => {
    const ctx = build();
    ctx.storage.rows.find((r) => r.uuid === 'admin')!.role = UserRole.RECEPTION;
    await expect(ctx.list.execute(actors.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('usuarios: bitácora de cambios de acceso', () => {
  it('registra quién, a quién y antes/después del nivel', async () => {
    const ctx = build();
    await ctx.update.execute('recep2', actors.ADMIN, { role: UserRole.ADMIN });
    expect(ctx.storage.audit).toEqual([
      expect.objectContaining({
        actorUuid: 'admin',
        targetUuid: 'recep2',
        field: 'ROLE',
        before: 'RECEPTION',
        after: 'ADMIN',
      }),
    ]);
  });

  it('registra atiende pacientes y especialidades en un mismo cambio', async () => {
    const ctx = build();
    await ctx.update.execute('recep2', actors.OWNER, {
      attendsPatients: true,
      specialties: [Specialty.ENT, Specialty.AUDIOLOGY],
    });
    expect(ctx.storage.audit.map((a) => [a.field, a.before, a.after])).toEqual([
      ['ATTENDS_PATIENTS', 'false', 'true'],
      ['SPECIALTIES', null, 'AUDIOLOGY,ENT'],
    ]);
  });

  it('apagar atiende pacientes registra también las especialidades que se vaciaron', async () => {
    const ctx = build();
    await ctx.update.execute('owner', actors.OWNER, { attendsPatients: false });
    expect(ctx.storage.audit.map((a) => [a.field, a.before, a.after])).toEqual([
      ['ATTENDS_PATIENTS', 'true', 'false'],
      ['SPECIALTIES', 'AUDIOLOGY', null],
    ]);
  });

  it('al crear un usuario registra su nivel inicial', async () => {
    const ctx = build();
    const created = await ctx.create.execute(newUser({ role: 'ADMIN' }), actors.OWNER);
    expect(ctx.storage.audit).toEqual([
      expect.objectContaining({
        actorUuid: 'owner',
        targetUuid: created.uuid,
        field: 'ROLE',
        before: null,
        after: 'ADMIN',
      }),
    ]);
  });

  it('solo Administración y propietario leen la bitácora', async () => {
    const ctx = build();
    await expect(ctx.audit.execute(actors.RECEPTION)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctx.audit.execute(actors.ADMIN)).resolves.toBeDefined();
  });
});

describe('usuarios: contraseña y sesión', () => {
  it('la contraseña nueva queda con hash y sirve para iniciar sesión', async () => {
    const ctx = build();
    await ctx.reset.execute('recep2', 'Nueva1234', actors.ADMIN);
    const stored = ctx.storage.rows.find((r) => r.uuid === 'recep2')!.password;
    expect(await bcrypt.compare('Nueva1234', stored)).toBe(true);
  });

  it('el reseteo del administrador queda en la bitácora sin valores', async () => {
    const ctx = build();
    await ctx.reset.execute('recep2', 'Nueva1234', actors.ADMIN);
    expect(ctx.storage.audit).toEqual([
      {
        actorUuid: 'admin',
        actorName: 'admin',
        targetUuid: 'recep2',
        field: UserAuditField.PASSWORD,
        before: null,
        after: null,
      },
    ]);
  });

  it('el token y la respuesta del login traen nivel, atiende pacientes y especialidades', async () => {
    const ctx = build();
    const owner = ctx.storage.rows.find((r) => r.uuid === 'owner')!;
    owner.password = await bcrypt.hash(PASSWORD, 4);
    owner.professionalTitle = 'LIC' as never;
    owner.licenseNumber = 'C-1234';
    const jwt = new JwtService({ secret: 'prueba' });
    const login = new LoginUseCase(
      ctx.storage as unknown as UserStorage,
      { compare: (a: string, b: string) => bcrypt.compare(a, b) } as unknown as BcryptService,
      jwt,
    );

    const result = await login.execute({ email: owner.email, password: PASSWORD });
    const payload = jwt.decode<Record<string, unknown>>(result.access_token);
    expect(payload).toMatchObject({
      role: 'OWNER',
      attendsPatients: true,
      specialties: ['AUDIOLOGY'],
    });
    expect(result.user).toMatchObject({
      role: 'OWNER',
      attendsPatients: true,
      specialties: ['AUDIOLOGY'],
      professionalTitle: 'LIC',
      licenseNumber: 'C-1234',
    });

    owner.role = UserRole.ADMIN;
    const refreshed = await login.refresh('owner', TENANT);
    expect(jwt.decode<Record<string, unknown>>(refreshed.access_token)).toMatchObject({
      role: 'ADMIN',
    });
    owner.status = UserStatus.INACTIVE;
    await expect(login.refresh('owner', TENANT)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
