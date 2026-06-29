import { CreateMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/create-medical-control.use-case';
import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards, UsePipes, ForbiddenException } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  CreateMedicalControlDto,
  CreateMedicalControlSchema,
} from '../dtos/create-medical-control.dto';
import { FindAllMedicalControlsUseCase } from '@medical-records/domain/use-cases/medical-control/find-all-medical-controls.use-case';
import { FindOneMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/find-one-medical-control.use-case';
import { MedicalSpeciality } from '@medical-records/domain/types/medical-control-content.types';
import { AddCorrectionNoteUseCase } from '@medical-records/domain/use-cases/medical-control/add-correction-note.use-case';
import { z } from 'zod';

const CorrectionNoteSchema = z.object({ correctionNotes: z.string().min(1) });
type CorrectionNoteDto = z.infer<typeof CorrectionNoteSchema>;

@Controller('medical-controls')
@UseGuards(AuthGuard)
export class MedicalControlController {
  constructor(
    private readonly createUseCase: CreateMedicalControlUseCase,
    private readonly findAllUseCase: FindAllMedicalControlsUseCase,
    private readonly findOneUseCase: FindOneMedicalControlUseCase,
    private readonly addCorrectionNoteUseCase: AddCorrectionNoteUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateMedicalControlSchema))
  async create(@Body() dto: CreateMedicalControlDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(dto, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Get('patient/:patientUUID')
  async findByPatient(
    @Param('patientUUID') patientUUID: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.findAllUseCase.execute(
      patientUUID,
      {
        tenantUuid: user.tenantUuid,
        speciality: user.specialty ? (user.specialty as MedicalSpeciality) : undefined,
      },
      { page: Number(page), limit: Number(limit) },
    );
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    const control = await this.findOneUseCase.execute(uuid, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });

    if (user.specialty && control.header.speciality !== user.specialty) {
      throw new ForbiddenException('No tienes permiso para ver controles de esta especialidad');
    }

    return control;
  }

  @Patch(':uuid/correction-note')
  @UsePipes(new ZodValidationPipe(CorrectionNoteSchema))
  async addCorrectionNote(
    @Param('uuid') uuid: string,
    @Body() dto: CorrectionNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.addCorrectionNoteUseCase.execute(uuid, user.tenantUuid, dto.correctionNotes);
  }
}
