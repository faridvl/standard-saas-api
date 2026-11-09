import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/** Valor del claim `service` con el que identity firma sus llamadas a este servicio. */
export const IDENTITY_SERVICE_CLAIM = 'identity';

interface ServiceTokenPayload {
  service?: string;
  tenantUuid?: string;
}

/**
 * Llamada backend-a-backend de identity: el mismo JWT de servicio que ya comparten los dos
 * servicios, atado a la clínica del cuerpo, para que un token de usuario no sirva.
 */
@Injectable()
export class IdentityServiceGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Este endpoint es solo para llamadas internas');
    }

    let payload: ServiceTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<ServiceTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const body = request.body as { tenantUuid?: unknown } | undefined;
    if (payload.service !== IDENTITY_SERVICE_CLAIM || payload.tenantUuid !== body?.tenantUuid) {
      throw new UnauthorizedException('Este endpoint es solo para llamadas internas');
    }
    return true;
  }
}
