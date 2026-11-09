/* eslint-disable @typescript-eslint/require-await -- el fake imita una API asíncrona */
import { describe, it, expect } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import {
  UserActor,
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
import { GetUsersUseCase } from './get-users.use-case';
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
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-01-01'),
  password: 'hash',
  ...overrides,
});

/** Storage en memoria con las mismas reglas de filtro por clínica que el real. */
class FakeUserStorage {
  rows: Row[];

  constructor(rows: Row[]) {
    this.rows = rows;
  }

  private find(uuid: string, tenant: string): Row | undefined {
    return this.rows.find((r) => r.uuid === uuid && r.tenantUUID === tenant);
  }

  async findByEmail(email: string): Promise<User | null> {
    const r = this.rows.find((x) => x.email === email);
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
    };
  }

  async findByUuidAndTenant(uuid: string, tenant: string): Promise<UserDomain | null> {
    return this.find(uuid, tenant) ?? null;
  }

  async save(data: Omit<Row, 'uuid' | 'createdAt'>): Promise<UserDomain> {
    const created = { ...data, uuid: `new-${this.rows.length}`, createdAt: new Date() } as Row;
    this.rows.push(created);
    return created;
  }

  async update(uuid: string, data: Partial<Row>): Promise<UserDomain> {
    const target = this.rows.find((r) => r.uuid === uuid) as Row;
    Object.assign(target, data);
    return target;
  }

  async updateStatus(uuid: string, status: UserStatus): Promise<void> {
    (this.rows.find((r) => r.uuid === uuid) as Row).status = status;
  }

  async updatePassword(uuid: string, hashed: string): Promise<void> {
    (this.rows.find((r) => r.uuid === uuid) as Row).password = hashed;
  }

  async countActiveOwners(tenant: string, excludeUuid: string): Promise<number> {
    return this.rows.filter(
      (r) =>
        r.tenantUUID === tenant &&
        r.role === UserRole.OWNER &&
        r.status === UserStatus.ACTIVE &&
        r.uuid !== excludeUuid,
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
}

const actorOf = (uuid: string, role: UserRole): UserActor => ({
  uuid,
  role,
  tenantId: 1,
  tenantUuid: TENANT,
});

const world = () => {
  const storage = new FakeUserStorage([
    row('owner-1', UserRole.OWNER),
    row('admin-1', UserRole.ADMIN),
    row('doctor-1', UserRole.DOCTOR),
    row('staff-1', UserRole.STAFF),
    row('foreign-1', UserRole.STAFF, { tenantUUID: OTHER_TENANT, email: 'f@otra.test' }),
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
  };
};

const NON_OWNERS: Array<[string, UserRole]> = [
  ['ADMIN', UserRole.ADMIN],
  ['DOCTOR', UserRole.DOCTOR],
  ['STAFF', UserRole.STAFF],
];

describe('administración de usuarios', () => {
  describe.each(NON_OWNERS)('un %s', (_name, role) => {
    const actor = actorOf('admin-1', role);

    it('recibe 403 al crear un usuario', async () => {
      const { create } = world();
      await expect(
        create.execute(
          { email: 'n@c.test', fullName: 'N', password: PASSWORD, role: UserRole.STAFF },
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recibe 403 al cambiar el rol de otro', async () => {
      const { update } = world();
      await expect(
        update.execute('staff-1', actor, { role: UserRole.ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recibe 403 al cambiar el estado de otro', async () => {
      const { setStatus } = world();
      await expect(setStatus.execute('staff-1', UserStatus.INACTIVE, actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('recibe 403 al poner contraseña a otro', async () => {
      const { reset } = world();
      await expect(reset.execute('staff-1', PASSWORD, actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('recibe 403 al borrar (desactivar) a otro', async () => {
      const { remove } = world();
      await expect(remove.execute('staff-1', actor)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recibe 403 al editar el perfil de otro', async () => {
      const { update } = world();
      await expect(update.execute('staff-1', actor, { fullName: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('perfil propio', () => {
    it('cualquier usuario edita su nombre sin mandar role', async () => {
      const { update } = world();
      const result = await update.execute('doctor-1', actorOf('doctor-1', UserRole.DOCTOR), {
        fullName: 'Dra. Nueva',
        phoneNumber: '8888-0000',
      });
      expect(result.fullName).toBe('Dra. Nueva');
    });

    it('un usuario que manda role sobre sí mismo recibe 403', async () => {
      const { update } = world();
      await expect(
        update.execute('doctor-1', actorOf('doctor-1', UserRole.DOCTOR), { role: UserRole.OWNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('OWNER', () => {
    const owner = actorOf('owner-1', UserRole.OWNER);

    it('crea un usuario en su clínica con la contraseña temporal cifrada', async () => {
      const { create, storage } = world();
      const created = await create.execute(
        { email: 'nuevo@c.test', fullName: 'Nuevo', password: PASSWORD, role: UserRole.DOCTOR },
        owner,
      );
      const saved = storage.rows.find((r) => r.uuid === created.uuid) as Row;
      expect(saved.tenantUUID).toBe(TENANT);
      expect(saved.status).toBe(UserStatus.ACTIVE);
      expect(saved.password).not.toBe(PASSWORD);
      await expect(bcrypt.compare(PASSWORD, saved.password)).resolves.toBe(true);
    });

    it('recibe 409 si el email ya existe', async () => {
      const { create } = world();
      await expect(
        create.execute(
          {
            email: 'staff-1@clinica.test',
            fullName: 'X',
            password: PASSWORD,
            role: UserRole.STAFF,
          },
          owner,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('cambia el rol de otro usuario', async () => {
      const { update } = world();
      const result = await update.execute('staff-1', owner, { role: UserRole.ADMIN });
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('pone contraseña nueva a un usuario de su clínica', async () => {
      const { reset, storage } = world();
      await reset.execute('staff-1', 'Otra1234', owner);
      const saved = storage.rows.find((r) => r.uuid === 'staff-1') as Row;
      await expect(bcrypt.compare('Otra1234', saved.password)).resolves.toBe(true);
    });

    it('no se desactiva a sí mismo', async () => {
      const { setStatus, remove } = world();
      await expect(setStatus.execute('owner-1', UserStatus.INACTIVE, owner)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(remove.execute('owner-1', owner)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no se baja el rol a sí mismo', async () => {
      const { update } = world();
      await expect(
        update.execute('owner-1', owner, { role: UserRole.ADMIN }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('desactiva y reactiva a otro usuario; DELETE solo desactiva', async () => {
      const { setStatus, remove, storage } = world();
      await remove.execute('staff-1', owner);
      expect((storage.rows.find((r) => r.uuid === 'staff-1') as Row).status).toBe(
        UserStatus.INACTIVE,
      );
      await setStatus.execute('staff-1', UserStatus.ACTIVE, owner);
      expect((storage.rows.find((r) => r.uuid === 'staff-1') as Row).status).toBe(
        UserStatus.ACTIVE,
      );
    });

    it('recibe 404 con un usuario de otra clínica en todas las operaciones', async () => {
      const { update, setStatus, remove, reset } = world();
      await expect(update.execute('foreign-1', owner, { fullName: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        setStatus.execute('foreign-1', UserStatus.INACTIVE, owner),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(remove.execute('foreign-1', owner)).rejects.toBeInstanceOf(NotFoundException);
      await expect(reset.execute('foreign-1', PASSWORD, owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('último OWNER activo', () => {
    it('con un solo OWNER activo no se puede desactivar ni bajar de rol', async () => {
      const w = world();
      const actor = actorOf('owner-2', UserRole.OWNER);
      w.storage.rows = [
        row('owner-1', UserRole.OWNER),
        row('owner-2', UserRole.OWNER, { status: UserStatus.INACTIVE }),
      ];
      await expect(
        w.setStatus.execute('owner-1', UserStatus.INACTIVE, actor),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        w.update.execute('owner-1', actor, { role: UserRole.ADMIN }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('con dos OWNER activos sí se puede', async () => {
      const w = world();
      w.storage.rows = [row('owner-1', UserRole.OWNER), row('owner-2', UserRole.OWNER)];
      const actor = actorOf('owner-2', UserRole.OWNER);

      await w.update.execute('owner-1', actor, { role: UserRole.ADMIN });
      expect(w.storage.rows[0].role).toBe(UserRole.ADMIN);

      w.storage.rows[0] = row('owner-1', UserRole.OWNER);
      await w.setStatus.execute('owner-1', UserStatus.INACTIVE, actor);
      expect(w.storage.rows[0].status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('lista', () => {
    it('devuelve activos e inactivos de su clínica por defecto y filtra por estado', async () => {
      const { list, storage } = world();
      (storage.rows.find((r) => r.uuid === 'staff-1') as Row).status = UserStatus.INACTIVE;

      const all = await list.execute(TENANT, 1, 10);
      expect(all.data.map((u) => u.uuid)).toContain('staff-1');
      expect(all.data.map((u) => u.uuid)).not.toContain('foreign-1');

      const inactive = await list.execute(TENANT, 1, 10, 'INACTIVE');
      expect(inactive.data.map((u) => u.uuid)).toEqual(['staff-1']);

      const active = await list.execute(TENANT, 1, 10, 'ACTIVE');
      expect(active.data.map((u) => u.uuid)).not.toContain('staff-1');
    });

    it('rechaza un estado inválido con 400', async () => {
      const { list } = world();
      await expect(list.execute(TENANT, 1, 10, 'BORRADO')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('inicio de sesión', () => {
    const build = () => {
      const w = world();
      const hash = bcrypt.hashSync(PASSWORD, 4);
      (w.storage.rows.find((r) => r.uuid === 'staff-1') as Row).password = hash;
      const jwt = { signAsync: async () => 'token' } as unknown as JwtService;
      const bcryptService = {
        compare: (plain: string, hashed: string) => bcrypt.compare(plain, hashed),
      } as unknown as BcryptService;
      const login = new LoginUseCase(w.storage as unknown as UserStorage, bcryptService, jwt);
      return { ...w, login };
    };

    it('un INACTIVE recibe 401 con el mismo mensaje que una clave mala', async () => {
      const { login, setStatus } = build();
      await setStatus.execute('staff-1', UserStatus.INACTIVE, actorOf('owner-1', UserRole.OWNER));

      const inactive = await login
        .execute({ email: 'staff-1@clinica.test', password: PASSWORD })
        .catch((e: unknown) => e);
      const wrongPassword = await login
        .execute({ email: 'staff-1@clinica.test', password: 'Equivocada1' })
        .catch((e: unknown) => e);

      expect(inactive).toBeInstanceOf(UnauthorizedException);
      expect((inactive as UnauthorizedException).message).toBe(
        (wrongPassword as UnauthorizedException).message,
      );
    });

    it('al reactivarlo vuelve a entrar', async () => {
      const { login, setStatus } = build();
      const owner = actorOf('owner-1', UserRole.OWNER);
      await setStatus.execute('staff-1', UserStatus.INACTIVE, owner);
      await setStatus.execute('staff-1', UserStatus.ACTIVE, owner);

      const result = await login.execute({ email: 'staff-1@clinica.test', password: PASSWORD });
      expect(result.access_token).toBe('token');
    });

    it('entra con la contraseña que le puso el OWNER', async () => {
      const { login, reset } = build();
      await reset.execute('staff-1', 'Nueva1234', actorOf('owner-1', UserRole.OWNER));

      const result = await login.execute({ email: 'staff-1@clinica.test', password: 'Nueva1234' });
      expect(result.user.email).toBe('staff-1@clinica.test');
    });
  });
});
