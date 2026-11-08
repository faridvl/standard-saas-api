import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ZodValidationPipe } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicContactData, ClinicDomain } from '../../types/clinic.types';
import { UpdateClinicContactSchema } from '../../dtos/update-clinic-contact.dto';
import { GetClinicUseCase } from './get-clinic.use-case';
import { UpdateClinicContactUseCase } from './update-clinic-contact.use-case';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

class FakeTenantStorage extends TenantStorage {
  rows = new Map<string, ClinicDomain>();
  lastContact: ClinicContactData | null = null;

  constructor() {
    super(null as never);
  }

  findClinicByUuid(uuid: string): Promise<ClinicDomain | null> {
    return Promise.resolve(this.rows.get(uuid) ?? null);
  }

  updateClinicContact(uuid: string, data: ClinicContactData): Promise<ClinicDomain | null> {
    const row = this.rows.get(uuid);
    if (!row) return Promise.resolve(null);
    this.lastContact = data;
    const next = { ...row, ...data };
    this.rows.set(uuid, next);
    return Promise.resolve(next);
  }
}

// Mismo camino que el controlador: el pipe valida y recorta el body, luego entra el use case.
const pipe = new ZodValidationPipe(UpdateClinicContactSchema);
const parseBody = (body: unknown) => pipe.transform(body, { type: 'body' }) as ClinicContactData;

describe('Datos de la clínica', () => {
  let storage: FakeTenantStorage;
  let getClinic: GetClinicUseCase;
  let updateContact: UpdateClinicContactUseCase;

  beforeEach(() => {
    storage = new FakeTenantStorage();
    storage.rows.set(TENANT_A, {
      businessName: 'Audio Color',
      logoUrl: 'https://cdn/logo.png',
      phone: null,
      email: null,
      address: null,
    });
    storage.rows.set(TENANT_B, {
      businessName: 'Otra clínica',
      logoUrl: null,
      phone: '+506 2222-3333',
      email: 'otra@clinica.cr',
      address: 'Heredia',
    });
    getClinic = new GetClinicUseCase(storage);
    updateContact = new UpdateClinicContactUseCase(storage);
  });

  it('lee la clínica del usuario con los cinco campos', async () => {
    await expect(getClinic.execute(TENANT_A)).resolves.toEqual({
      businessName: 'Audio Color',
      logoUrl: 'https://cdn/logo.png',
      phone: null,
      email: null,
      address: null,
    });
  });

  it('leer una clínica inexistente da 404', async () => {
    await expect(getClinic.execute('nada')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza teléfono, correo y dirección', async () => {
    const result = await updateContact.execute(
      TENANT_A,
      'OWNER',
      parseBody({ phone: '+506 8888-7777', email: ' info@audio.cr ', address: ' San José ' }),
    );

    expect(result).toEqual({
      businessName: 'Audio Color',
      logoUrl: 'https://cdn/logo.png',
      phone: '+506 8888-7777',
      email: 'info@audio.cr',
      address: 'San José',
    });
  });

  it('ADMIN también puede escribir', async () => {
    await expect(
      updateContact.execute(TENANT_A, 'ADMIN', parseBody({ address: 'Cartago' })),
    ).resolves.toMatchObject({ address: 'Cartago' });
  });

  it.each(['DOCTOR', 'STAFF', 'USER', null, undefined])('el rol %s recibe 403', async (role) => {
    await expect(
      updateContact.execute(TENANT_A, role, parseBody({ phone: '8888-7777' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.lastContact).toBeNull();
  });

  it('correo inválido da 400', () => {
    expect(() => parseBody({ email: 'no-es-correo' })).toThrow(BadRequestException);
  });

  it('teléfono inválido da 400', () => {
    expect(() => parseBody({ phone: 'abc' })).toThrow(BadRequestException);
    expect(() => parseBody({ phone: '1234' })).toThrow(BadRequestException);
    expect(() => parseBody({ phone: '1'.repeat(21) })).toThrow(BadRequestException);
  });

  it('acepta los formatos de teléfono de pacientes', () => {
    expect(parseBody({ phone: '+506 8888-7777' }).phone).toBe('+506 8888-7777');
    expect(parseBody({ phone: '8888-7777' }).phone).toBe('8888-7777');
    expect(parseBody({ phone: '+13055551234' }).phone).toBe('+13055551234');
  });

  it('dirección de más de 300 caracteres da 400', () => {
    expect(() => parseBody({ address: 'a'.repeat(301) })).toThrow(BadRequestException);
    expect(parseBody({ address: 'a'.repeat(300) }).address).toHaveLength(300);
  });

  it('cadena vacía se guarda como null', async () => {
    const result = await updateContact.execute(
      TENANT_B,
      'OWNER',
      parseBody({ phone: '', email: '   ', address: '' }),
    );

    expect(result).toMatchObject({ phone: null, email: null, address: null });
  });

  it('un campo omitido no se toca', async () => {
    const result = await updateContact.execute(
      TENANT_B,
      'OWNER',
      parseBody({ address: 'Alajuela' }),
    );

    expect(storage.lastContact).toEqual({ address: 'Alajuela' });
    expect(result).toMatchObject({ phone: '+506 2222-3333', email: 'otra@clinica.cr' });
  });

  it('el nombre no se cambia aunque venga en el body', async () => {
    const result = await updateContact.execute(
      TENANT_A,
      'OWNER',
      parseBody({ businessName: 'Hackeado', logoUrl: 'x', phone: '8888-7777' }),
    );

    expect(storage.lastContact).toEqual({ phone: '8888-7777' });
    expect(result.businessName).toBe('Audio Color');
    expect(result.logoUrl).toBe('https://cdn/logo.png');
  });

  it('solo toca la clínica del token', async () => {
    await updateContact.execute(TENANT_A, 'OWNER', parseBody({ address: 'Solo A' }));

    expect(storage.rows.get(TENANT_B)?.address).toBe('Heredia');
  });
});
