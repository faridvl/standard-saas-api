import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { UpdateTenantDto, UpdateTenantSchema } from '../../domain/dtos/update-tenant.dto';
import { TenantDomain } from '../../domain/types/auth.types';
import { ClinicDomain } from '../../domain/types/clinic.types';
import { GetClinicUseCase } from '../../domain/use-cases/clinic/get-clinic.use-case';
import { UpdateClinicContactUseCase } from '../../domain/use-cases/clinic/update-clinic-contact.use-case';
import { UploadClinicLogoUseCase } from '../../domain/use-cases/clinic/upload-clinic-logo.use-case';
import { RemoveClinicLogoUseCase } from '../../domain/use-cases/clinic/remove-clinic-logo.use-case';
import {
  UpdateClinicContactDto,
  UpdateClinicContactSchema,
} from '../../domain/dtos/update-clinic-contact.dto';

// Tope de memoria de multer; el límite real de 2 MB lo valida el caso de uso con mensaje claro.
const LOGO_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    private readonly getClinicUseCase: GetClinicUseCase,
    private readonly updateClinicContactUseCase: UpdateClinicContactUseCase,
    private readonly uploadClinicLogoUseCase: UploadClinicLogoUseCase,
    private readonly removeClinicLogoUseCase: RemoveClinicLogoUseCase,
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

  @Post('current/logo')
  @UseInterceptors(FileInterceptor('file', LOGO_UPLOAD_OPTIONS))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ClinicDomain> {
    return await this.uploadClinicLogoUseCase.execute(
      currentUser.tenantUuid,
      currentUser.role,
      file,
    );
  }

  @Delete('current/logo')
  async removeLogo(@CurrentUser() currentUser: JwtPayload): Promise<ClinicDomain> {
    return await this.removeClinicLogoUseCase.execute(currentUser.tenantUuid, currentUser.role);
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
