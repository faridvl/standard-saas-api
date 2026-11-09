import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@project/core';
import { AccessRequirement, canAccess } from '@medical-records/domain/policies/access.policy';
import { ACCESS_METADATA_KEY } from '@medical-records/app/decorators/access.decorators';

/**
 * Va después de `AuthGuard`. Lee el requisito de la ruta (la del método manda sobre la del
 * controlador). Falla cerrado: una ruta sin clasificar da 403 en vez de quedar abierta.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(
      ACCESS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();

    if (!requirement || !user || !canAccess(user, requirement)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
