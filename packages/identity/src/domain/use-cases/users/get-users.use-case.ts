import { Injectable } from '@nestjs/common';
import { UserDomain } from '../../../domain/types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { PaginatedResponse } from '../../../domain/types/pagination.types';

@Injectable()
export class GetUsersUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(
    tenantUUID: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<UserDomain>> {
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.min(100, Math.max(1, limit));

    return await this.userStorage.findAllByTenant(tenantUUID, sanitizedPage, sanitizedLimit);
  }
}
