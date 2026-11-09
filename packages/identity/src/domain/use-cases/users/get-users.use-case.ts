import { BadRequestException, Injectable } from '@nestjs/common';
import { UserDomain, UserStatusFilter } from '../../../domain/types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { PaginatedResponse } from '../../../domain/types/pagination.types';

/** Máximo de usuarios por página en `GET /users`. */
export const USERS_LIST_MAX_LIMIT = 100;

@Injectable()
export class GetUsersUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
    status: string = UserStatusFilter.ALL,
  ): Promise<PaginatedResponse<UserDomain>> {
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.min(USERS_LIST_MAX_LIMIT, Math.max(1, limit));

    if (!Object.values<string>(UserStatusFilter).includes(status)) {
      throw new BadRequestException('El estado debe ser ACTIVE, INACTIVE o ALL');
    }

    return await this.userStorage.findAllByTenant(
      tenantUUID,
      sanitizedPage,
      sanitizedLimit,
      status as UserStatusFilter,
    );
  }
}
