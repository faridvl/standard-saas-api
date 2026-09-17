import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { FindAllBranchesUseCase } from '@medical-records/domain/use-cases/branches/find-all-branches.use-case';

@Controller('branches')
@UseGuards(AuthGuard)
export class BranchController {
  constructor(private readonly findAllUseCase: FindAllBranchesUseCase) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }
}
