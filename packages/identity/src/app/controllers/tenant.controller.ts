import { Body, Controller, Param, Patch, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { UpdateTenantDto, UpdateTenantSchema } from '../../domain/dtos/update-tenant.dto';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(private readonly updateTenantUseCase: UpdateTenantUseCase) {}

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdateTenantSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return await this.updateTenantUseCase.execute(uuid, currentUser.tenantUuid, dto);
  }
}
