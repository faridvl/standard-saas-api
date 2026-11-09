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
import { GetUsersUseCase, USERS_LIST_MAX_LIMIT } from './get-users.use-case';
import { ZodValidationPipe } from '@project/core';
import { CreateUserSchema } from '../../dtos/create-user.dto';
import { UpdateUserSchema } from '../../dtos/update-user.dto';
import { RegisterTenantSchema } from '../../dtos/register-tenant.dto';
import { LoginSchema } from '../../../app/dtos/login.dto';
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

  describe('actor releído de la base', () => {
    const ownerToken = actorOf('owner-1', UserRole.OWNER);

    const everyAdminAction = (w: ReturnType<typeof world>, actor: UserActor) => [
      w.create.execute(
        { email: 'n@c.test', fullName: 'N', password: PASSWORD, role: UserRole.STAFF },
        actor,
      ),
      w.update.execute('staff-1', actor, { role: UserRole.ADMIN }),
      w.update.execute('staff-1', actor, { fullName: 'X' }),
      w.setStatus.execute('staff-1', UserStatus.INACTIVE, actor),
      w.reset.execute('staff-1', PASSWORD, actor),
      w.remove.execute('staff-1', actor),
    ];

    it('un OWNER desactivado con token vigente recibe 403 en todo', async () => {
      const w = world();
      (w.storage.rows.find((r) => r.uuid === 'owner-1') as Row).status = UserStatus.INACTIVE;
      for (const action of everyAdminAction(w, ownerToken)) {
        await expect(action).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('un OWNER degradado en la base con token de OWNER recibe 403 en todo', async () => {
      const w = world();
      (w.storage.rows.find((r) => r.uuid === 'owner-1') as Row).role = UserRole.STAFF;
      for (const action of everyAdminAction(w, ownerToken)) {
        await expect(action).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('un usuario desactivado tampoco edita su propio perfil', async () => {
      const w = world();
      (w.storage.rows.find((r) => r.uuid === 'doctor-1') as Row).status = UserStatus.INACTIVE;
      await expect(
        w.update.execute('doctor-1', actorOf('doctor-1', UserRole.DOCTOR), { fullName: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un actor que ya no existe en la clínica recibe 403', async () => {
      const w = world();
      const ghost = actorOf('fantasma', UserRole.OWNER);
      for (const action of everyAdminAction(w, ghost)) {
        await expect(action).rejects.toBeInstanceOf(ForbiddenException);
      }
    });

    it('un rol nulo o heredado en la base no administra usuarios', async () => {
      const legacy: Array<UserRole | null> = [null, UserRole.USER, UserRole.MEDICO];
      for (const role of legacy) {
        const w = world();
        (w.storage.rows.find((r) => r.uuid === 'owner-1') as Row).role = role as UserRole;
        for (const action of everyAdminAction(w, ownerToken)) {
          await expect(action).rejects.toBeInstanceOf(ForbiddenException);
        }
      }
    });
  });

  describe('estado propio', () => {
    it('el OWNER no cambia su propio estado en ningún sentido', async () => {
      const { setStatus, remove } = world();
      const owner = actorOf('owner-1', UserRole.OWNER);
      await expect(setStatus.execute('owner-1', UserStatus.ACTIVE, owner)).rejects.toThrow(
        'No puedes cambiar tu propio estado',
      );
      await expect(setStatus.execute('owner-1', UserStatus.INACTIVE, owner)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(remove.execute('owner-1', owner)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('un OWNER inactivo no se reactiva a sí mismo con un token vigente', async () => {
      const { setStatus, storage } = world();
      (storage.rows.find((r) => r.uuid === 'owner-1') as Row).status = UserStatus.INACTIVE;
      await expect(
        setStatus.execute('owner-1', UserStatus.ACTIVE, actorOf('owner-1', UserRole.OWNER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('un OWNER no administra a otro OWNER', () => {
    const owner = actorOf('owner-1', UserRole.OWNER);
    const twoOwners = () => {
      const w = world();
      w.storage.rows.push(row('owner-2', UserRole.OWNER));
      return w;
    };

    it('recibe 403 con mensaje claro en rol, estado, contraseña y DELETE', async () => {
      const w = twoOwners();
      const message = 'Un propietario no puede administrar a otro propietario';
      await expect(w.update.execute('owner-2', owner, { role: UserRole.STAFF })).rejects.toThrow(
        message,
      );
      await expect(w.setStatus.execute('owner-2', UserStatus.INACTIVE, owner)).rejects.toThrow(
        message,
      );
      await expect(w.reset.execute('owner-2', PASSWORD, owner)).rejects.toThrow(message);
      await expect(w.remove.execute('owner-2', owner)).rejects.toBeInstanceOf(ForbiddenException);
      expect((w.storage.rows.find((r) => r.uuid === 'owner-2') as Row).status).toBe(
        UserStatus.ACTIVE,
      );
    });

    it('recibe 403 al editar los datos de perfil del otro OWNER', async () => {
      const w = twoOwners();
      await expect(w.update.execute('owner-2', owner, { fullName: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('sí edita su propio perfil y su propia contraseña', async () => {
      const w = twoOwners();
      const result = await w.update.execute('owner-1', owner, { fullName: 'Yo' });
      expect(result.fullName).toBe('Yo');
      await w.reset.execute('owner-1', 'Otra1234', owner);
    });
  });

  describe('firma y foto', () => {
    const owner = actorOf('owner-1', UserRole.OWNER);
    const url = 'https://cdn.clinica.test/identity/avatars/x.png';

    it('el OWNER no cambia la firma ni la foto de otro, ni por PATCH ni antes de subir', async () => {
      const { update } = world();
      await expect(update.execute('staff-1', owner, { avatarUrl: url })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(update.execute('staff-1', owner, { signatureUrl: url })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(update.assertCanChangeOwnMedia('staff-1', owner)).rejects.toThrow(
        'La firma y la foto solo las cambia su dueño',
      );
    });

    it('cada usuario activo cambia su propia firma y foto', async () => {
      const { update } = world();
      const doctor = actorOf('doctor-1', UserRole.DOCTOR);
      await expect(update.assertCanChangeOwnMedia('doctor-1', doctor)).resolves.toBeUndefined();
      const result = await update.execute('doctor-1', doctor, {
        avatarUrl: url,
        signatureUrl: url,
      });
      expect(result.avatarUrl).toBe(url);
    });

    it('un usuario desactivado no puede subir su foto', async () => {
      const { update, storage } = world();
      (storage.rows.find((r) => r.uuid === 'doctor-1') as Row).status = UserStatus.INACTIVE;
      await expect(
        update.assertCanChangeOwnMedia('doctor-1', actorOf('doctor-1', UserRole.DOCTOR)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('correo en minúsculas', () => {
    it('al crear guarda el correo en minúsculas y detecta duplicados sin importar mayúsculas', async () => {
      const { create, storage } = world();
      const owner = actorOf('owner-1', UserRole.OWNER);
      const created = await create.execute(
        { email: '  Nuevo@Clinica.TEST ', fullName: 'N', password: PASSWORD, role: UserRole.STAFF },
        owner,
      );
      expect((storage.rows.find((r) => r.uuid === created.uuid) as Row).email).toBe(
        'nuevo@clinica.test',
      );
      await expect(
        create.execute(
          {
            email: 'STAFF-1@clinica.test',
            fullName: 'X',
            password: PASSWORD,
            role: UserRole.STAFF,
          },
          owner,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('los esquemas de crear, iniciar sesión y registrar bajan el correo a minúsculas', () => {
      expect(
        CreateUserSchema.parse({ email: ' A@B.Co ', fullName: 'N', password: PASSWORD }).email,
      ).toBe('a@b.co');
      expect(LoginSchema.parse({ email: 'A@B.Co', password: 'x' }).email).toBe('a@b.co');
      expect(
        RegisterTenantSchema.parse({
          email: 'A@B.Co',
          password: PASSWORD,
          ownerName: 'N',
          businessName: 'Clinica',
        }).email,
      ).toBe('a@b.co');
    });
  });

  describe('roles asignables y URLs', () => {
    it('OWNER se rechaza al crear y al editar', () => {
      const base = { email: 'a@b.co', fullName: 'N', password: PASSWORD };
      expect(CreateUserSchema.safeParse({ ...base, role: 'OWNER' }).success).toBe(false);
      expect(UpdateUserSchema.safeParse({ role: 'OWNER' }).success).toBe(false);
      for (const role of ['ADMIN', 'DOCTOR', 'STAFF']) {
        expect(CreateUserSchema.safeParse({ ...base, role }).success).toBe(true);
      }
    });

    it('en el endpoint OWNER da 400', () => {
      const pipe = new ZodValidationPipe(UpdateUserSchema);
      expect(() => pipe.transform({ role: 'OWNER' }, { type: 'body' })).toThrow(
        BadRequestException,
      );
    });

    it('firma y foto solo aceptan https del bucket propio o null', () => {
      const previous = process.env.R2_PUBLIC_URL;
      process.env.R2_PUBLIC_URL = 'https://cdn.clinica.test';
      try {
        const ok = (v: unknown) => UpdateUserSchema.safeParse({ avatarUrl: v }).success;
        expect(ok('https://cdn.clinica.test/identity/avatars/x.png')).toBe(true);
        expect(ok(null)).toBe(true);
        expect(ok('http://cdn.clinica.test/x.png')).toBe(false);
        expect(ok('https://otro.test/x.png')).toBe(false);
        expect(ok('https://cdn.clinica.test.evil.test/x.png')).toBe(false);
        expect(ok('data:image/png;base64,AAAA')).toBe(false);
        expect(ok('javascript:alert(1)')).toBe(false);
        expect(
          UpdateUserSchema.safeParse({ signatureUrl: 'https://otro.test/x.png' }).success,
        ).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.R2_PUBLIC_URL;
        else process.env.R2_PUBLIC_URL = previous;
      }
    });

    it('sin R2_PUBLIC_URL configurado no se acepta ninguna URL', () => {
      const previous = process.env.R2_PUBLIC_URL;
      delete process.env.R2_PUBLIC_URL;
      try {
        const result = UpdateUserSchema.safeParse({ avatarUrl: 'https://cdn.clinica.test/x.png' });
        expect(result.success).toBe(false);
      } finally {
        if (previous !== undefined) process.env.R2_PUBLIC_URL = previous;
      }
    });
  });

  describe('roles heredados', () => {
    it('se listan sin romper, incluido el rol nulo', async () => {
      const { list, storage } = world();
      storage.rows.push(
        row('legacy-1', UserRole.USER),
        row('legacy-2', UserRole.MEDICO),
        row('legacy-3', UserRole.STAFF, { role: null as unknown as UserRole }),
      );
      const result = await list.execute(TENANT, 1, 10);
      expect(result.data.map((u) => u.uuid)).toEqual(
        expect.arrayContaining(['legacy-1', 'legacy-2', 'legacy-3']),
      );
    });
  });

  describe('lista', () => {
    it('limita la página al máximo definido', async () => {
      const { list } = world();
      const result = await list.execute(TENANT, 1, USERS_LIST_MAX_LIMIT + 50);
      expect(result.meta.limit).toBe(USERS_LIST_MAX_LIMIT);
      expect(USERS_LIST_MAX_LIMIT).toBe(100);
    });

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
