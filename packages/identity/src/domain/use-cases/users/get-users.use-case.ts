import { BadRequestException, Injectable } from '@nestjs/common';
import { UserActor, UserDomain, UserStatusFilter } from '../../../domain/types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { PaginatedResponse } from '../../../domain/types/pagination.types';
import { resolveUserAdmin } from '../../policies/user-admin.policy';

/** Máximo de usuarios por página en `GET /users`. */
export const USERS_LIST_MAX_LIMIT = 100;

@Injectable()
export class GetUsersUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(
    actor: UserActor,
    page: number = 1,
    limit: number = 10,
    status: string = UserStatusFilter.ALL,
  ): Promise<PaginatedResponse<UserDomain>> {
    await resolveUserAdmin(this.userStorage, actor);

    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.min(USERS_LIST_MAX_LIMIT, Math.max(1, limit));

    if (!Object.values<string>(UserStatusFilter).includes(status)) {
      throw new BadRequestException('El estado debe ser ACTIVE, INACTIVE o ALL');
    }

    return await this.userStorage.findAllByTenant(
      actor.tenantUuid,
      sanitizedPage,
      sanitizedLimit,
      status as UserStatusFilter,
    );
  }
}
