import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StorageService, ZodValidationPipe } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicContactData, ClinicRecord } from '../../types/clinic.types';
import {
  CLINIC_NAME_MAX_LENGTH,
  UpdateClinicContactSchema,
} from '../../dtos/update-clinic-contact.dto';
import { buildClinicLogoKey } from '../../utils/clinic-logo.util';
import { GetClinicUseCase } from './get-clinic.use-case';
import { UpdateClinicContactUseCase } from './update-clinic-contact.use-case';
import { UploadClinicLogoUseCase } from './upload-clinic-logo.use-case';
import { RemoveClinicLogoUseCase } from './remove-clinic-logo.use-case';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const PUBLIC_BASE = 'https://pub.test';
const TWO_MB = 2 * 1024 * 1024;

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(8),
]);
const SVG = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
const file = (buffer: Buffer) => ({ buffer, size: buffer.length });

const row = (overrides: Partial<ClinicRecord> = {}): ClinicRecord => ({
  businessName: 'Audio Color',
  logoKey: null,
  logoUrl: null,
  phone: null,
  email: null,
  address: null,
  ...overrides,
});

class FakeTenantStorage extends TenantStorage {
  rows = new Map<string, ClinicRecord>();
  lastContact: ClinicContactData | null = null;

  constructor() {
    super(null as never);
  }

  findClinicByUuid(uuid: string): Promise<ClinicRecord | null> {
    return Promise.resolve(this.rows.get(uuid) ?? null);
  }

  updateClinicContact(uuid: string, data: ClinicContactData): Promise<ClinicRecord | null> {
    const current = this.rows.get(uuid);
    if (!current) return Promise.resolve(null);
    this.lastContact = data;
    const { name, ...contact } = data;
    const next = { ...current, ...contact, ...(name !== undefined && { businessName: name }) };
    this.rows.set(uuid, next);
    return Promise.resolve(next);
  }

  setClinicLogoKey(uuid: string, logoKey: string | null): Promise<ClinicRecord | null> {
    const current = this.rows.get(uuid);
    if (!current) return Promise.resolve(null);
    const next = { ...current, logoKey, logoUrl: null };
    this.rows.set(uuid, next);
    return Promise.resolve(next);
  }
}

class FakeStorageService extends StorageService {
  objects = new Map<string, { size: number; contentType: string; disposition?: string }>();
  deleted: string[] = [];
  failDelete = false;

  putObject(
    key: string,
    body: Buffer,
    contentType: string,
    contentDisposition?: string,
  ): Promise<string> {
    this.objects.set(key, { size: body.length, contentType, disposition: contentDisposition });
    return Promise.resolve(key);
  }

  deleteObject(key: string): Promise<void> {
    if (this.failDelete) return Promise.reject(new Error('storage caído'));
    this.objects.delete(key);
    this.deleted.push(key);
    return Promise.resolve();
  }

  getPublicUrl(key: string): string {
    return `${PUBLIC_BASE}/${key}`;
  }
}

// Mismo camino que el controlador: el pipe valida y recorta el body, luego entra el use case.
const pipe = new ZodValidationPipe(UpdateClinicContactSchema);
const parseBody = (body: unknown) => pipe.transform(body, { type: 'body' }) as ClinicContactData;

describe('Datos de la clínica', () => {
  let storage: FakeTenantStorage;
  let files: FakeStorageService;
  let getClinic: GetClinicUseCase;
  let updateContact: UpdateClinicContactUseCase;
  let uploadLogo: UploadClinicLogoUseCase;
  let removeLogo: RemoveClinicLogoUseCase;

  beforeEach(() => {
    storage = new FakeTenantStorage();
    files = new FakeStorageService();
    storage.rows.set(TENANT_A, row({ logoUrl: 'https://cdn/logo.png' }));
    storage.rows.set(
      TENANT_B,
      row({
        businessName: 'Otra clínica',
        phone: '+506 2222-3333',
        email: 'otra@clinica.cr',
        address: 'Heredia',
      }),
    );
    getClinic = new GetClinicUseCase(storage, files);
    updateContact = new UpdateClinicContactUseCase(storage, files);
    uploadLogo = new UploadClinicLogoUseCase(storage, files);
    removeLogo = new RemoveClinicLogoUseCase(storage, files);
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

  it('cambia el nombre recortando espacios', async () => {
    const result = await updateContact.execute(
      TENANT_A,
      'OWNER',
      parseBody({ name: '  Clínica Nueva  ' }),
    );

    expect(storage.lastContact).toEqual({ name: 'Clínica Nueva' });
    expect(result.businessName).toBe('Clínica Nueva');
    expect(result.logoUrl).toBe('https://cdn/logo.png');
  });

  it('nombre vacío o solo espacios da 400', () => {
    expect(() => parseBody({ name: '' })).toThrow(BadRequestException);
    expect(() => parseBody({ name: '   ' })).toThrow(BadRequestException);
  });

  it('nombre demasiado largo da 400', () => {
    expect(() => parseBody({ name: 'a'.repeat(CLINIC_NAME_MAX_LENGTH + 1) })).toThrow(
      BadRequestException,
    );
    expect(parseBody({ name: 'a'.repeat(CLINIC_NAME_MAX_LENGTH) }).name).toHaveLength(
      CLINIC_NAME_MAX_LENGTH,
    );
  });

  it('cambiar el nombre exige OWNER o ADMIN', async () => {
    await expect(
      updateContact.execute(TENANT_A, 'DOCTOR', parseBody({ name: 'Otro' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.rows.get(TENANT_A)?.businessName).toBe('Audio Color');
  });

  it('businessName, logoUrl y logoKey del body se ignoran', async () => {
    const result = await updateContact.execute(
      TENANT_A,
      'OWNER',
      parseBody({ businessName: 'Hackeado', logoUrl: 'x', logoKey: 'y', phone: '8888-7777' }),
    );

    expect(storage.lastContact).toEqual({ phone: '8888-7777' });
    expect(result.businessName).toBe('Audio Color');
    expect(result.logoUrl).toBe('https://cdn/logo.png');
  });

  it('solo toca la clínica del token', async () => {
    await updateContact.execute(TENANT_A, 'OWNER', parseBody({ address: 'Solo A' }));

    expect(storage.rows.get(TENANT_B)?.address).toBe('Heredia');
  });

  describe('logo', () => {
    it.each([
      ['PNG', PNG, 'image/png', 'png'],
      ['JPG', JPG, 'image/jpeg', 'jpg'],
      ['WEBP', WEBP, 'image/webp', 'webp'],
      ['SVG', SVG, 'image/svg+xml', 'svg'],
    ])('sube un %s y devuelve la URL pública', async (_name, buffer, mime, ext) => {
      const result = await uploadLogo.execute(TENANT_A, 'OWNER', file(buffer));

      const stored = storage.rows.get(TENANT_A);
      const key = stored?.logoKey ?? '';
      expect(key.startsWith(`identity/${TENANT_A}/logos/logo-`)).toBe(true);
      expect(key.endsWith(`.${ext}`)).toBe(true);
      expect(result.logoUrl).toBe(`${PUBLIC_BASE}/${key}`);
      expect(files.objects.get(key)?.contentType).toBe(mime);
      expect(files.objects.get(key)?.disposition).toBe(ext === 'svg' ? 'attachment' : undefined);
      expect(stored?.logoUrl).toBeNull();
    });

    it('ADMIN también puede subir', async () => {
      await expect(uploadLogo.execute(TENANT_A, 'ADMIN', file(PNG))).resolves.toBeDefined();
    });

    it.each(['DOCTOR', 'STAFF', null, undefined])('el rol %s recibe 403 al subir', async (role) => {
      await expect(uploadLogo.execute(TENANT_A, role, file(PNG))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(files.objects.size).toBe(0);
    });

    it.each(['DOCTOR', null])('el rol %s recibe 403 al quitar', async (role) => {
      await expect(removeLogo.execute(TENANT_A, role)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza un .txt', async () => {
      await expect(
        uploadLogo.execute(TENANT_A, 'OWNER', file(Buffer.from('hola, no soy una imagen'))),
      ).rejects.toThrow('Formato no permitido');
      expect(files.objects.size).toBe(0);
    });

    it('rechaza más de 2 MB', async () => {
      const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);

      await expect(uploadLogo.execute(TENANT_A, 'OWNER', file(big))).rejects.toThrow(
        'El logo no puede pesar más de 2 MB.',
      );
      expect(files.objects.size).toBe(0);
    });

    it('acepta justo 2 MB', async () => {
      const exact = Buffer.concat([PNG, Buffer.alloc(TWO_MB - PNG.length)]);

      await expect(uploadLogo.execute(TENANT_A, 'OWNER', file(exact))).resolves.toBeDefined();
    });

    it('rechaza un SVG con script o contenido activo', async () => {
      const malicious = [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><x:script xmlns:x="http://www.w3.org/2000/svg">alert(1)</x:script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><h:script xmlns:h="http://www.w3.org/1999/xhtml">alert(1)</h:script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><h:iframe xmlns:h="http://www.w3.org/1999/xhtml"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="&#106;avascript:alert(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#9;script:alert(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="java\tscript:alert(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href=" vbscript:msgbox(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html,<b>x</b>"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/2001/xml-events" x:onload="alert(1)"></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><circle onclick = "alert(1)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><x:handler xmlns:x="http://www.w3.org/2001/xml-events"/></svg>',
        '<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"></svg>',
        '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"></svg>',
      ];
      for (const content of malicious) {
        await expect(
          uploadLogo.execute(TENANT_A, 'OWNER', file(Buffer.from(content))),
        ).rejects.toThrow('El SVG no puede contener scripts');
      }
      expect(files.objects.size).toBe(0);
    });

    it('acepta un SVG limpio con enlaces internos', async () => {
      const clean =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>' +
        '<use xlink:href="#g"/><a href="https://audiocolors.cr"><text>Audio Color</text></a></svg>';

      await expect(
        uploadLogo.execute(TENANT_A, 'OWNER', file(Buffer.from(clean))),
      ).resolves.toBeDefined();
    });

    it('rechaza un archivo que dice ser imagen pero no lo es', async () => {
      await expect(
        uploadLogo.execute(TENANT_A, 'OWNER', file(Buffer.from('MZ ejecutable'))),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sin archivo da 400', async () => {
      await expect(uploadLogo.execute(TENANT_A, 'OWNER', undefined)).rejects.toThrow(
        'Falta el archivo',
      );
    });

    it('reemplazar borra el objeto anterior', async () => {
      await uploadLogo.execute(TENANT_A, 'OWNER', file(PNG));
      const first = storage.rows.get(TENANT_A)?.logoKey ?? '';
      await new Promise((resolve) => setTimeout(resolve, 5));

      await uploadLogo.execute(TENANT_A, 'OWNER', file(JPG));
      const second = storage.rows.get(TENANT_A)?.logoKey ?? '';

      expect(second).not.toBe(first);
      expect(files.deleted).toEqual([first]);
      expect(files.objects.has(second)).toBe(true);
    });

    it('no borra el objeto recién subido si la key anterior es la misma', async () => {
      const key = buildClinicLogoKey(TENANT_A, 'png', 123);
      storage.rows.set(TENANT_A, row({ logoKey: key }));
      const now = jest.spyOn(Date, 'now').mockReturnValue(123);

      await uploadLogo.execute(TENANT_A, 'OWNER', file(PNG));
      now.mockRestore();

      expect(files.deleted).toEqual([]);
      expect(files.objects.has(key)).toBe(true);
    });

    it('si falla borrar el anterior, el reemplazo igual funciona', async () => {
      storage.rows.set(TENANT_A, row({ logoKey: 'identity/viejo.png' }));
      files.failDelete = true;

      const result = await uploadLogo.execute(TENANT_A, 'OWNER', file(PNG));

      expect(result.logoUrl).toContain(PUBLIC_BASE);
    });

    it('quitar deja logoUrl en null y borra el objeto', async () => {
      await uploadLogo.execute(TENANT_A, 'OWNER', file(PNG));
      const key = storage.rows.get(TENANT_A)?.logoKey ?? '';

      const result = await removeLogo.execute(TENANT_A, 'OWNER');

      expect(result.logoUrl).toBeNull();
      expect(storage.rows.get(TENANT_A)?.logoKey).toBeNull();
      expect(files.deleted).toEqual([key]);
    });

    it('quitar sin logo propio no falla', async () => {
      await expect(removeLogo.execute(TENANT_B, 'OWNER')).resolves.toMatchObject({
        logoUrl: null,
      });
      expect(files.deleted).toEqual([]);
    });

    it('subir no toca el logo de otra clínica', async () => {
      await uploadLogo.execute(TENANT_A, 'OWNER', file(PNG));

      expect(storage.rows.get(TENANT_B)?.logoKey).toBeNull();
    });

    it('leer la clínica arma logoUrl desde la key', async () => {
      storage.rows.set(TENANT_A, row({ logoKey: 'identity/a/logos/logo-1.png' }));

      await expect(getClinic.execute(TENANT_A)).resolves.toMatchObject({
        logoUrl: `${PUBLIC_BASE}/identity/a/logos/logo-1.png`,
      });
    });

    it('la key manda sobre la URL heredada', async () => {
      storage.rows.set(
        TENANT_A,
        row({ logoKey: 'identity/a/logos/logo-1.png', logoUrl: 'https://cdn/viejo.png' }),
      );

      const result = await getClinic.execute(TENANT_A);

      expect(result.logoUrl).toBe(`${PUBLIC_BASE}/identity/a/logos/logo-1.png`);
    });

    it('la respuesta no expone logoKey', async () => {
      storage.rows.set(TENANT_A, row({ logoKey: 'identity/a/logos/logo-1.png' }));

      const result = await getClinic.execute(TENANT_A);

      expect(Object.keys(result)).not.toContain('logoKey');
    });
  });
});
