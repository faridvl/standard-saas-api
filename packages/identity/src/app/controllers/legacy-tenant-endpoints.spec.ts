import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtPayload, StorageService } from '@project/core';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { UpdateUserUseCase } from '../../domain/use-cases/users/update-user.use-case';
import { TenantDomain } from '../../domain/types/auth.types';
import { TenantController } from './tenant.controller';
import { UploadController } from './upload.controller';

const TENANT = 'tenant-a';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const SVG_WITH_SCRIPT = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><x:script xmlns:x="http://www.w3.org/2000/svg"/></svg>',
);

const user = (role: string | null): JwtPayload => ({
  sub: 'user-1',
  email: 'u@test.cr',
  role,
  tenantId: 1,
  tenantUuid: TENANT,
});

const multerFile = (buffer: Buffer, mimetype: string) =>
  ({ buffer, mimetype, originalname: 'logo.png', size: buffer.length }) as Express.Multer.File;

class FakeUpdateTenant extends UpdateTenantUseCase {
  calls = 0;

  constructor() {
    super(null as never);
  }

  execute(): Promise<TenantDomain> {
    this.calls += 1;
    return Promise.resolve({} as TenantDomain);
  }
}

class FakeStorage extends StorageService {
  uploads: { mimetype: string; disposition?: string }[] = [];

  upload(
    _api: string,
    _tenantId: string,
    _tipo: string,
    file: Express.Multer.File,
    _id?: string,
    contentDisposition?: string,
  ): Promise<string> {
    this.uploads.push({ mimetype: file.mimetype, disposition: contentDisposition });
    return Promise.resolve('https://pub.test/logo');
  }
}

describe('Endpoints heredados de tenant', () => {
  let updateTenant: FakeUpdateTenant;
  let storage: FakeStorage;
  let tenantController: TenantController;
  let uploadController: UploadController;

  beforeEach(() => {
    updateTenant = new FakeUpdateTenant();
    storage = new FakeStorage();
    tenantController = new TenantController(
      updateTenant,
      null as never,
      null as never,
      null as never,
      null as never,
    );
    uploadController = new UploadController(
      storage,
      null as unknown as UpdateUserUseCase,
      updateTenant,
    );
  });

  describe('PATCH /tenants/:uuid', () => {
    it.each(['DOCTOR', 'STAFF', null])('el rol %s recibe 403', async (role) => {
      await expect(
        tenantController.update(TENANT, { businessName: 'X' }, user(role)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateTenant.calls).toBe(0);
    });

    it.each(['OWNER', 'ADMIN'])('el rol %s puede modificar', async (role) => {
      await tenantController.update(TENANT, { businessName: 'X' }, user(role));
      expect(updateTenant.calls).toBe(1);
    });
  });

  describe('POST /upload/tenants/:uuid/logo', () => {
    it.each(['DOCTOR', 'STAFF', null])('el rol %s recibe 403', async (role) => {
      await expect(
        uploadController.uploadTenantLogo(TENANT, multerFile(PNG, 'image/png'), user(role)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.uploads).toEqual([]);
      expect(updateTenant.calls).toBe(0);
    });

    it('OWNER sube y la respuesta conserva la forma { url }', async () => {
      const result = await uploadController.uploadTenantLogo(
        TENANT,
        multerFile(PNG, 'image/png'),
        user('OWNER'),
      );

      expect(result).toEqual({ url: 'https://pub.test/logo' });
      expect(updateTenant.calls).toBe(1);
    });

    it('guarda el tipo detectado por el contenido, no el que declara el cliente', async () => {
      await uploadController.uploadTenantLogo(TENANT, multerFile(PNG, 'text/html'), user('ADMIN'));

      expect(storage.uploads).toEqual([{ mimetype: 'image/png', disposition: undefined }]);
    });

    it('un SVG limpio se guarda como attachment', async () => {
      await uploadController.uploadTenantLogo(
        TENANT,
        multerFile(SVG, 'image/svg+xml'),
        user('OWNER'),
      );

      expect(storage.uploads).toEqual([{ mimetype: 'image/svg+xml', disposition: 'attachment' }]);
    });

    it('rechaza un SVG con contenido activo y un archivo que no es imagen', async () => {
      await expect(
        uploadController.uploadTenantLogo(
          TENANT,
          multerFile(SVG_WITH_SCRIPT, 'image/svg+xml'),
          user('OWNER'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        uploadController.uploadTenantLogo(
          TENANT,
          multerFile(Buffer.from('<html></html>'), 'image/png'),
          user('OWNER'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploads).toEqual([]);
    });
  });
});
