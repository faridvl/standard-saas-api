import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IDENTITY_SERVICE_CLAIM, IdentityServiceGuard } from './identity-service.guard';

const SECRET = 'secreto-de-prueba';
const TENANT = '11111111-1111-4111-8111-111111111111';

describe('IdentityServiceGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const guard = new IdentityServiceGuard(jwt, {
    get: () => SECRET,
  } as unknown as ConfigService);

  const contextOf = (authorization: string | undefined, tenantUuid: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization }, body: { tenantUuid } }),
      }),
    }) as unknown as ExecutionContext;

  const sign = (payload: object, secret = SECRET): string =>
    jwt.sign(payload, { secret, expiresIn: '1m' });

  it('acepta el token de servicio de identity para esa clínica', async () => {
    const token = sign({ service: IDENTITY_SERVICE_CLAIM, tenantUuid: TENANT });
    await expect(guard.canActivate(contextOf(`Bearer ${token}`, TENANT))).resolves.toBe(true);
  });

  it.each([
    ['sin token', undefined],
    ['con un esquema que no es Bearer', 'Basic abc'],
    [
      'con un token firmado con otra clave',
      `Bearer ${sign({ service: 'identity', tenantUuid: TENANT }, 'otra')}`,
    ],
    [
      'con un token de usuario (sin claim de servicio)',
      `Bearer ${sign({ sub: 'u', tenantUuid: TENANT, role: 'OWNER' })}`,
    ],
    [
      'con el token de servicio de otra clínica',
      `Bearer ${sign({ service: 'identity', tenantUuid: 'otra' })}`,
    ],
  ])('rechaza con 401 %s', async (_name, authorization) => {
    await expect(guard.canActivate(contextOf(authorization, TENANT))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
