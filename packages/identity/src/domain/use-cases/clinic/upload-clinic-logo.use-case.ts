import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StorageService } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { CLINIC_LOGO_MAX_BYTES, ClinicDomain } from '../../types/clinic.types';
import {
  buildClinicLogoKey,
  CLINIC_LOGO_FORMAT_ERROR,
  detectClinicLogoFormat,
  toClinicDomain,
} from '../../utils/clinic-logo.util';
import { assertCanManageClinic } from '../../utils/clinic-permissions.util';

export type ClinicLogoFile = { buffer: Buffer; size: number };

@Injectable()
export class UploadClinicLogoUseCase {
  private readonly logger = new Logger(UploadClinicLogoUseCase.name);

  constructor(
    private readonly tenantStorage: TenantStorage,
    private readonly storageService: StorageService,
  ) {}

  /** Sube o reemplaza el logo: guarda la key nueva y borra el objeto anterior. */
  async execute(
    tenantUuid: string,
    role: string | null | undefined,
    file: ClinicLogoFile | undefined,
  ): Promise<ClinicDomain> {
    assertCanManageClinic(role);

    if (!file?.buffer?.length) throw new BadRequestException('Falta el archivo del logo.');
    if (file.size > CLINIC_LOGO_MAX_BYTES) {
      throw new BadRequestException('El logo no puede pesar más de 2 MB.');
    }
    const format = detectClinicLogoFormat(file.buffer);
    if (!format) throw new BadRequestException(CLINIC_LOGO_FORMAT_ERROR);

    const current = await this.tenantStorage.findClinicByUuid(tenantUuid);
    if (!current) throw new NotFoundException('Clínica no encontrada');

    const key = buildClinicLogoKey(tenantUuid, format.extension);
    await this.storageService.putObject(key, file.buffer, format.mimeType);

    const updated = await this.tenantStorage.setClinicLogoKey(tenantUuid, key);
    if (!updated) throw new NotFoundException('Clínica no encontrada');

    if (current.logoKey) await this.deleteQuietly(current.logoKey);
    return toClinicDomain(updated, (value) => this.storageService.getPublicUrl(value));
  }

  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storageService.deleteObject(key);
    } catch (error) {
      this.logger.warn(`No se pudo borrar el logo anterior ${key}: ${String(error)}`);
    }
  }
}
