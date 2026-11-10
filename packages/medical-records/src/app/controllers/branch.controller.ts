import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AnyLevel, MinLevel } from '@medical-records/app/decorators/access.decorators';
import { AccessLevel } from '@medical-records/domain/policies/access.policy';
import { BranchEntity } from '@medical-records/domain/entities/branch.entity';
import {
  CreateBranchUseCase,
  FindAllBranchesUseCase,
  UpdateBranchUseCase,
} from '@medical-records/domain/use-cases/branches';
import {
  CreateBranchDto,
  CreateBranchSchema,
  UpdateBranchDto,
  UpdateBranchSchema,
} from '@medical-records/app/dtos/branch.dto';

@Controller('branches')
@UseGuards(AuthGuard, AccessGuard)
export class BranchController {
  constructor(
    private readonly findAllUseCase: FindAllBranchesUseCase,
    private readonly createUseCase: CreateBranchUseCase,
    private readonly updateUseCase: UpdateBranchUseCase,
  ) {}

  // Ver las sedes lo necesita todo el que registra pacientes o agenda; cambiarlas es configuración.
  @Get()
  @AnyLevel()
  async findAll(@CurrentUser() user: JwtPayload): Promise<BranchEntity[]> {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Post()
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateBranchSchema))
  async create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BranchEntity> {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }

  @Patch(':uuid')
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateBranchSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BranchEntity> {
    return await this.updateUseCase.execute(user.tenantUuid, uuid, dto);
  }
}
