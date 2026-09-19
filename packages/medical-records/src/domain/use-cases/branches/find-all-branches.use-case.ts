import { Injectable } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';

@Injectable()
export class FindAllBranchesUseCase {
  constructor(private readonly storage: BranchStorage) {}

  async execute(tenantUuid: string): Promise<Branch[]> {
    return await this.storage.findAll(tenantUuid);
  }
}
