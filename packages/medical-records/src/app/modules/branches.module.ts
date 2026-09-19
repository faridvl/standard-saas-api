import { Module } from '@nestjs/common';
import { BranchController } from '../controllers/branch.controller';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { FindAllBranchesUseCase } from '@medical-records/domain/use-cases/branches';

const CONTROLLERS = [BranchController];
const USE_CASES = [FindAllBranchesUseCase];
const STORAGES = [BranchStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class BranchesModule {}
