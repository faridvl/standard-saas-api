import { Controller, Get, UseGuards } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AnyLevel } from '@medical-records/app/decorators/access.decorators';
import { FindAllBranchesUseCase } from '@medical-records/domain/use-cases/branches/find-all-branches.use-case';

@Controller('branches')
@UseGuards(AuthGuard, AccessGuard)
@AnyLevel()
export class BranchController {
  constructor(private readonly findAllUseCase: FindAllBranchesUseCase) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload): Promise<Branch[]> {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }
}
