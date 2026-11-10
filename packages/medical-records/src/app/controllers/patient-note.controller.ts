import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
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
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
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
