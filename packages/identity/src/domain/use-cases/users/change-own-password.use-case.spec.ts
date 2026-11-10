/* eslint-disable @typescript-eslint/require-await -- el fake imita una API asíncrona */
import { describe, it, expect, beforeEach } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserCredentials, UserStorage } from '../../../infrastructure/adapters/user.storage';
import { ZodValidationPipe } from '@project/core';
import { ChangeOwnPasswordSchema } from '../../dtos/change-own-password.dto';
import { UserActor, UserAuditChange, UserAuditField, UserStatus } from '../../types/user.types';
import {
  ChangeOwnPasswordUseCase,
  INVALID_CURRENT_PASSWORD_CODE,
  SAME_PASSWORD_CODE,
} from './change-own-password.use-case';

const TENANT = 'tenant-a';
const CURRENT = 'Actual123';
const NEXT = 'Nueva1234';

type Row = UserCredentials & { tenantUuid: string };

class FakeUserStorage {
  updates: { uuid: string; hash: string; audit: UserAuditChange[] }[] = [];

  constructor(public rows: Row[]) {}

  async findCredentialsByUuidAndTenant(uuid: string, tenant: string) {
    return this.rows.find((r) => r.uuid === uuid && r.tenantUuid === tenant) ?? null;
  }

  async updatePassword(uuid: string, hash: string, audit: UserAuditChange[] = []) {
    this.updates.push({ uuid, hash, audit });
  }
}

const actor = (uuid: string, tenantUuid = TENANT): UserActor => ({
  uuid,
  role: 'RECEPTION',
  tenantId: 1,
  tenantUuid,
});

const codeOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return ((error as BadRequestException).getResponse() as { code: string }).code;
  }
  throw new Error('Se esperaba un error');
};

describe('ChangeOwnPasswordUseCase', () => {
  let storage: FakeUserStorage;
  let useCase: ChangeOwnPasswordUseCase;

  beforeEach(async () => {
    storage = new FakeUserStorage([
      {
        uuid: 'ana',
        fullName: 'Ana',
        tenantUuid: TENANT,
        status: UserStatus.ACTIVE,
        password: await bcrypt.hash(CURRENT, 4),
      },
      {
        uuid: 'inactiva',
        fullName: 'Inactiva',
        tenantUuid: TENANT,
        status: UserStatus.INACTIVE,
        password: await bcrypt.hash(CURRENT, 4),
      },
    ]);
    useCase = new ChangeOwnPasswordUseCase(storage as unknown as UserStorage);
  });

  it('con la actual correcta guarda la nueva con hash y deja constancia sin valores', async () => {
    await useCase.execute(actor('ana'), CURRENT, NEXT);

    expect(storage.updates).toHaveLength(1);
    const [update] = storage.updates;
    expect(update.uuid).toBe('ana');
    expect(update.hash).not.toBe(NEXT);
    expect(await bcrypt.compare(NEXT, update.hash)).toBe(true);
    expect(update.audit).toEqual([
      {
        actorUuid: 'ana',
        actorName: 'Ana',
        field: UserAuditField.PASSWORD,
        before: null,
        after: null,
      },
    ]);
  });

  it('con la actual incorrecta responde INVALID_CURRENT_PASSWORD y no actualiza', async () => {
    const code = await codeOf(useCase.execute(actor('ana'), 'Otra12345', NEXT));
    expect(code).toBe(INVALID_CURRENT_PASSWORD_CODE);
    expect(storage.updates).toHaveLength(0);
  });

  it('si la nueva es igual a la actual responde SAME_PASSWORD y no actualiza', async () => {
    const code = await codeOf(useCase.execute(actor('ana'), CURRENT, CURRENT));
    expect(code).toBe(SAME_PASSWORD_CODE);
    expect(storage.updates).toHaveLength(0);
  });

  it('un usuario inactivo o de otra clínica recibe 404 y no se actualiza nada', async () => {
    await expect(useCase.execute(actor('inactiva'), CURRENT, NEXT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(useCase.execute(actor('ana', 'tenant-b'), CURRENT, NEXT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.updates).toHaveLength(0);
  });
});

describe('ChangeOwnPasswordSchema', () => {
  const pipe = new ZodValidationPipe(ChangeOwnPasswordSchema);
  const validate = (value: unknown) => pipe.transform(value, { type: 'body' });

  it('acepta una nueva que cumple las reglas', () => {
    expect(validate({ currentPassword: CURRENT, newPassword: NEXT })).toEqual({
      currentPassword: CURRENT,
      newPassword: NEXT,
    });
  });

  it.each([
    ['corta', 'Ab1'],
    ['sin mayúscula', 'nueva12345'],
    ['sin número', 'NuevaClave'],
  ])('rechaza una nueva %s con 400', (_name, newPassword) => {
    expect(() => validate({ currentPassword: CURRENT, newPassword })).toThrow(BadRequestException);
  });

  it('acepta una nueva de exactamente 72 bytes', () => {
    const newPassword = `A1${'a'.repeat(70)}`;
    expect(validate({ currentPassword: CURRENT, newPassword }).newPassword).toBe(newPassword);
  });

  it.each([
    ['73 bytes ASCII', `A1${'a'.repeat(71)}`],
    ['«ñ» (40 caracteres, 80 bytes)', `A1${'ñ'.repeat(39)}`],
    ['emoji (20 caracteres, 82 bytes)', `A1${'😀'.repeat(20)}`],
  ])('rechaza una nueva de más de 72 bytes: %s', (_name, newPassword) => {
    expect(newPassword.length).toBeLessThanOrEqual(80);
    expect(() => validate({ currentPassword: CURRENT, newPassword })).toThrow(BadRequestException);
  });

  it('rechaza una actual de más de 72 bytes', () => {
    expect(() => validate({ currentPassword: 'ñ'.repeat(37), newPassword: NEXT })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza si falta la actual', () => {
    expect(() => validate({ newPassword: NEXT })).toThrow(BadRequestException);
  });
});
