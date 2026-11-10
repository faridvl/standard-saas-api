import { Injectable } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { PaginatedResponse } from '../../types/pagination.types';
import { resolveUserAdmin } from '../../policies/user-admin.policy';
import { UserActor, UserAuditEntry } from '../../types/user.types';
import { USERS_LIST_MAX_LIMIT } from './get-users.use-case';

@Injectable()
export class GetUserAuditUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(
    actor: UserActor,
    page: number = 1,
    limit: number = 20,
    targetUuid?: string,
  ): Promise<PaginatedResponse<UserAuditEntry>> {
    await resolveUserAdmin(this.userStorage, actor);
    return this.userStorage.findAuditByTenant(
      actor.tenantUuid,
      Math.max(1, page),
      Math.min(USERS_LIST_MAX_LIMIT, Math.max(1, limit)),
      targetUuid,
    );
  }
}
