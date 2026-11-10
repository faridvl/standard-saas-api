import { ConflictException } from '@nestjs/common';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import {
  BRANCH_NAME_TAKEN_CODE,
  normalizeBranchName,
} from '@medical-records/domain/utils/branch-name.util';

/** El nombre es único por clínica sin distinguir mayúsculas ni tildes (activas e inactivas). */
export function assertBranchNameFree(
  name: string,
  branches: BranchEntity[],
  exceptUuid?: string,
): void {
  const wanted = normalizeBranchName(name);
  const taken = branches.some(
    (branch) => branch.uuid !== exceptUuid && normalizeBranchName(branch.name) === wanted,
  );
  if (taken) {
    throw new ConflictException({
      message: 'Ya existe una sede con ese nombre',
      code: BRANCH_NAME_TAKEN_CODE,
    });
  }
}
