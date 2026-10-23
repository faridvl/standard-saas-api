import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  CreatePatientNoteDto,
  CreatePatientNoteSchema,
} from '@medical-records/app/dtos/patient-note.dto';
import { CreatePatientNoteUseCase } from '@medical-records/domain/use-cases/patient-notes/create-patient-note.use-case';
import {
  FindPatientNotesUseCase,
  PatientNoteWithAuthor,
} from '@medical-records/domain/use-cases/patient-notes/find-patient-notes.use-case';

/** Control de evolución: notas clínicas, fuera del alcance de STAFF. */
@Controller('patients/:patientUuid/notes')
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
export class PatientNoteController {
  constructor(
    private readonly createUseCase: CreatePatientNoteUseCase,
    private readonly findUseCase: FindPatientNotesUseCase,
  ) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientNoteWithAuthor[]> {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientNoteSchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientNoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientNoteWithAuthor> {
    return await this.createUseCase.execute({
      patientUuid,
      tenantUuid: user.tenantUuid,
      authorUuid: user.sub,
      category: dto.category,
      text: dto.text,
    });
  }
}
