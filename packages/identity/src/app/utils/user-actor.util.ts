import { JwtPayload } from '@project/core';
import { UserActor } from '../../domain/types/user.types';

export function toUserActor(payload: JwtPayload): UserActor {
  return {
    uuid: payload.sub,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantUuid: payload.tenantUuid,
  };
}
