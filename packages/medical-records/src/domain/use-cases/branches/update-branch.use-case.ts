import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import { UpdateBranchDto } from '@medical-records/app/dtos/branch.dto';
import {
  BRANCH_LAST_ACTIVE_CODE,
  emptyToNull,
} from '@medical-records/domain/utils/branch-name.util';
import { assertBranchNameFree } from './branch-name-taken';

@Injectable()
export class UpdateBranchUseCase {
  constructor(private readonly storage: BranchStorage) {}

  async execute(tenantUuid: string, uuid: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    const all = await this.storage.findAll(tenantUuid);
    const current = all.find((branch) => branch.uuid === uuid);
    if (!current) {
      throw new NotFoundException('Sede no encontrada');
    }
    if (dto.name !== undefined) assertBranchNameFree(dto.name, all, uuid);
    if (dto.isActive === false && current.isActive) {
      const otherActive = all.some((branch) => branch.uuid !== uuid && branch.isActive);
      if (!otherActive) {
        throw new ConflictException({
          message: 'No puedes desactivar la única sede activa',
          code: BRANCH_LAST_ACTIVE_CODE,
        });
      }
    }

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
