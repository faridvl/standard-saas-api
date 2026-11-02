import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, RolesGuard, ZodValidationPipe } from '@project/core';
import {
  CLINICAL_ACCESS_ROLES,
  ROLES_METADATA_KEY,
} from '@medical-records/domain/policies/clinical-access.policy';
import {
  CreatePatientQuestionnaireEntryDto,
  CreatePatientQuestionnaireEntrySchema,
  FindPatientQuestionnaireEntriesQuerySchema,
} from '@medical-records/app/dtos/patient-questionnaire-entry.dto';
import { PatientQuestionnaireEntryEntity } from '@medical-records/domain/entities/patient-questionnaire-entry.entity';
import {
  CreatePatientQuestionnaireEntryUseCase,
  FindPatientQuestionnaireEntriesUseCase,
} from '@medical-records/domain/use-cases/patient-questionnaire-entries';

/** Secciones propias de la clínica llenadas por paciente: datos clínicos, fuera del alcance de STAFF. */
@Controller('patients/:patientUuid/questionnaire-entries')
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
export class PatientQuestionnaireEntryController {
  constructor(
    private readonly createUseCase: CreatePatientQuestionnaireEntryUseCase,
    private readonly findUseCase: FindPatientQuestionnaireEntriesUseCase,
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
}
