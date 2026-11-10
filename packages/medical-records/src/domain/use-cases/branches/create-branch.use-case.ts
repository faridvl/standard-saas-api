import { Injectable } from '@nestjs/common';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import { CreateBranchDto } from '@medical-records/app/dtos/branch.dto';
import { emptyToNull } from '@medical-records/domain/utils/branch-name.util';
import { assertBranchNameFree } from './branch-name-taken';

@Injectable()
export class CreateBranchUseCase {
  constructor(private readonly storage: BranchStorage) {}

  async execute(tenantUuid: string, dto: CreateBranchDto): Promise<BranchEntity> {
    assertBranchNameFree(dto.name, await this.storage.findAll(tenantUuid));
    return await this.storage.create(tenantUuid, {
      name: dto.name,
      color: dto.color,
      phone: emptyToNull(dto.phone),
      address: emptyToNull(dto.address),
    });
  }
}
