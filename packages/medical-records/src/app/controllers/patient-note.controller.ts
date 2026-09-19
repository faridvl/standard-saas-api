import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  CreatePatientNoteDto,
  CreatePatientNoteSchema,
} from '@medical-records/app/dtos/patient-note.dto';
import { CreatePatientNoteUseCase } from '@medical-records/domain/use-cases/patient-notes/create-patient-note.use-case';
import {
  FindPatientNotesUseCase,
  PatientNoteWithAuthor,
} from '@medical-records/domain/use-cases/patient-notes/find-patient-notes.use-case';

@Controller('patients/:patientUuid/notes')
@UseGuards(AuthGuard)
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
