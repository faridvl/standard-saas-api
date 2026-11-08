import { Body, Controller, Get, Param, Patch, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { UpdateTenantDto, UpdateTenantSchema } from '../../domain/dtos/update-tenant.dto';
import { TenantDomain } from '../../domain/types/auth.types';
import { ClinicDomain } from '../../domain/types/clinic.types';
import { GetClinicUseCase } from '../../domain/use-cases/clinic/get-clinic.use-case';
import { UpdateClinicContactUseCase } from '../../domain/use-cases/clinic/update-clinic-contact.use-case';
import {
  UpdateClinicContactDto,
  UpdateClinicContactSchema,
} from '../../domain/dtos/update-clinic-contact.dto';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    private readonly getClinicUseCase: GetClinicUseCase,
    private readonly updateClinicContactUseCase: UpdateClinicContactUseCase,
  ) {}

  // `current` va antes que `:uuid`: la clínica sale del JWT, nunca de la URL.
  @Get('current')
  async getCurrent(@CurrentUser() currentUser: JwtPayload): Promise<ClinicDomain> {
    return await this.getClinicUseCase.execute(currentUser.tenantUuid);
  }

  @Patch('current')
  @UsePipes(new ZodValidationPipe(UpdateClinicContactSchema))
  async updateCurrent(
    @Body() dto: UpdateClinicContactDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ClinicDomain> {
    return await this.updateClinicContactUseCase.execute(
      currentUser.tenantUuid,
      currentUser.role,
      dto,
    );
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdateTenantSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TenantDomain> {
    return await this.updateTenantUseCase.execute(uuid, currentUser.tenantUuid, dto);
  }
}
