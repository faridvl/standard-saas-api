import { Injectable } from '@nestjs/common';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import { BRANCH_LOCALE } from '@medical-records/domain/utils/branch-name.util';

const collator = new Intl.Collator(BRANCH_LOCALE, { sensitivity: 'base' });

/** Activas primero y luego por nombre, sin distinguir mayúsculas ni tildes. */
function sortBranches(branches: BranchEntity[]): BranchEntity[] {
  return [...branches].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || collator.compare(a.name, b.name),
  );
}

@Injectable()
export class FindAllBranchesUseCase {
  constructor(private readonly storage: BranchStorage) {}

  async execute(tenantUuid: string): Promise<BranchEntity[]> {
    return sortBranches(await this.storage.findAll(tenantUuid));
  }
}
