import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AnyLevel, MinLevel } from '@medical-records/app/decorators/access.decorators';
import { AccessLevel } from '@medical-records/domain/policies/access.policy';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import {
  CreateEquipmentUseCase,
  FindAllEquipmentUseCase,
  UpdateEquipmentUseCase,
} from '@medical-records/domain/use-cases/equipment';
import {
  CreateEquipmentDto,
  CreateEquipmentSchema,
  UpdateEquipmentDto,
  UpdateEquipmentSchema,
} from '@medical-records/app/dtos/equipment.dto';

@Controller('equipment')
@UseGuards(AuthGuard, AccessGuard)
export class EquipmentController {
  constructor(
    private readonly findAllUseCase: FindAllEquipmentUseCase,
    private readonly createUseCase: CreateEquipmentUseCase,
    private readonly updateUseCase: UpdateEquipmentUseCase,
  ) {}

  // Quien hace audiometrías elige el equipo; cambiar el catálogo es configuración.
  @Get()
  @AnyLevel()
  async findAll(@CurrentUser() user: JwtPayload): Promise<EquipmentEntity[]> {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Post()
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateEquipmentSchema))
  async create(
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EquipmentEntity> {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }

  // Desactivar y reactivar son `isActive` en este mismo PATCH: nada se borra.
  @Patch(':uuid')
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateEquipmentSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EquipmentEntity> {
    return await this.updateUseCase.execute(user.tenantUuid, uuid, dto);
  }
}
