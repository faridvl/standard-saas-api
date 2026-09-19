import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '@project/core';

export interface IdentityUser {
  uuid: string;
  fullName: string;
}

/**
 * Llama al servicio identity para resolver un usuario por uuid.
 * Uso backend-a-backend: firma un JWT de servicio con el mismo JWT_SECRET
 * que ya comparten identity y medical-records (ver ARCHITECTURE.md), en vez
 * de introducir un mecanismo de auth nuevo entre servicios.
 */
@Injectable()
export class IdentityRepository {
  private readonly logger = new Logger(IdentityRepository.name);

  constructor(private readonly jwtService: JwtService) {}

  async getUser(uuid: string, tenantUuid: string): Promise<IdentityUser | null> {
    if (!env.IDENTITY_SERVICE_URL) {
      this.logger.warn('IDENTITY_SERVICE_URL no configurada, no se puede resolver el usuario');
      return null;
    }

    const serviceToken = await this.jwtService.signAsync(
      { sub: uuid, tenantUuid },
      { secret: env.JWT_SECRET, expiresIn: '1m' },
    );

    try {
      const response = await fetch(`${env.IDENTITY_SERVICE_URL}/users/${uuid}`, {
        headers: { Authorization: `Bearer ${serviceToken}` },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as IdentityUser;
      return { uuid: data.uuid, fullName: data.fullName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo resolver el usuario ${uuid} en identity: ${message}`);
      return null;
    }
  }
}
