import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
import {
  CreatePatientQuestionnaireEntryDto,
  CreatePatientQuestionnaireEntrySchema,
  FindPatientQuestionnaireEntriesQuerySchema,
  UpdatePatientQuestionnaireEntryDto,
  UpdatePatientQuestionnaireEntrySchema,
} from '@medical-records/app/dtos/patient-questionnaire-entry.dto';
import { PatientQuestionnaireEntryEntity } from '@medical-records/domain/entities/patient-questionnaire-entry.entity';
import {
  CreatePatientQuestionnaireEntryUseCase,
  FindPatientQuestionnaireEntriesUseCase,
  UpdatePatientQuestionnaireEntryUseCase,
} from '@medical-records/domain/use-cases/patient-questionnaire-entries';

/** Secciones propias de la clínica llenadas por paciente: datos clínicos, fuera del alcance de STAFF. */
@Controller('patients/:patientUuid/questionnaire-entries')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class PatientQuestionnaireEntryController {
  constructor(
    private readonly createUseCase: CreatePatientQuestionnaireEntryUseCase,
    private readonly findUseCase: FindPatientQuestionnaireEntriesUseCase,
    private readonly updateUseCase: UpdatePatientQuestionnaireEntryUseCase,
  ) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @Query('templateUuid') templateUuid: string | undefined,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientQuestionnaireEntryEntity[]> {
    const query = FindPatientQuestionnaireEntriesQuerySchema.safeParse({ templateUuid });
    if (!query.success) throw new BadRequestException('La sección no es válida');
    return await this.findUseCase.execute(patientUuid, user.tenantUuid, query.data.templateUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientQuestionnaireEntrySchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientQuestionnaireEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientQuestionnaireEntryEntity> {
    return await this.createUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }

  @Patch(':entryUuid')
  @UsePipes(new ZodValidationPipe(UpdatePatientQuestionnaireEntrySchema))
  async update(
    @Param('patientUuid') patientUuid: string,
    @Param('entryUuid') entryUuid: string,
    @Body() dto: UpdatePatientQuestionnaireEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientQuestionnaireEntryEntity> {
    return await this.updateUseCase.execute(patientUuid, entryUuid, user.tenantUuid, user.sub, dto);
  }
}
