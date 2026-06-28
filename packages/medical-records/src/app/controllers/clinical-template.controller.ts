import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/create-clinical-template.use-case';
import { FindAllClinicalTemplatesUseCase } from '@medical-records/domain/use-cases/clinical-templates/find-all-clinical-templates.use-case';
import { FindClinicalTemplateBySpecialityUseCase } from '@medical-records/domain/use-cases/clinical-templates/find-clinical-template-by-speciality.use-case';
import { UpdateClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/update-clinical-template.use-case';
import { DeleteClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/delete-clinical-template.use-case';
import {
  CreateClinicalTemplateDto,
  CreateClinicalTemplateSchema,
  UpdateClinicalTemplateDto,
  UpdateClinicalTemplateSchema,
} from '@medical-records/app/dtos/clinical-template.dto';

@Controller('clinical-templates')
@UseGuards(AuthGuard)
export class ClinicalTemplateController {
  constructor(
    private readonly createUseCase: CreateClinicalTemplateUseCase,
    private readonly findAllUseCase: FindAllClinicalTemplatesUseCase,
    private readonly findBySpecialityUseCase: FindClinicalTemplateBySpecialityUseCase,
    private readonly updateUseCase: UpdateClinicalTemplateUseCase,
    private readonly deleteUseCase: DeleteClinicalTemplateUseCase,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Get('speciality/:speciality')
  async findBySpeciality(
    @Param('speciality') speciality: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.findBySpecialityUseCase.execute(user.tenantUuid, speciality);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateClinicalTemplateSchema))
  async create(@Body() dto: CreateClinicalTemplateDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdateClinicalTemplateSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateClinicalTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.updateUseCase.execute(uuid, user.tenantUuid, dto);
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.deleteUseCase.execute(uuid, user.tenantUuid);
  }
}
