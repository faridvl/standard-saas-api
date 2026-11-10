import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import { UpdateBranchDto } from '@medical-records/app/dtos/branch.dto';
import { emptyToNull } from '@medical-records/domain/utils/branch-name.util';
import { assertBranchNameFree } from './branch-name-taken';

@Injectable()
export class UpdateBranchUseCase {
  constructor(private readonly storage: BranchStorage) {}

  async execute(tenantUuid: string, uuid: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    const all = await this.storage.findAll(tenantUuid);
    if (!all.some((branch) => branch.uuid === uuid)) {
      throw new NotFoundException('Sede no encontrada');
    }
    if (dto.name !== undefined) assertBranchNameFree(dto.name, all, uuid);

    const updated = await this.storage.update(tenantUuid, uuid, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.phone !== undefined && { phone: emptyToNull(dto.phone) }),
      ...(dto.address !== undefined && { address: emptyToNull(dto.address) }),
    });
    if (!updated) throw new NotFoundException('Sede no encontrada');
    return updated;
  }
}
