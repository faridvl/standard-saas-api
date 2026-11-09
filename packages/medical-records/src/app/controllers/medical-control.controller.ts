import { CreateMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/create-medical-control.use-case';
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
import {
  CreateMedicalControlDto,
  CreateMedicalControlSchema,
} from '../dtos/create-medical-control.dto';
import { FindAllMedicalControlsUseCase } from '@medical-records/domain/use-cases/medical-control/find-all-medical-controls.use-case';
import { FindOneMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/find-one-medical-control.use-case';
import { AddCorrectionNoteUseCase } from '@medical-records/domain/use-cases/medical-control/add-correction-note.use-case';
import { MedicalControlEntity } from '@medical-records/domain/entities/medical-control.entity';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { z } from 'zod';

const CorrectionNoteSchema = z.object({ correctionNotes: z.string().min(1) });
type CorrectionNoteDto = z.infer<typeof CorrectionNoteSchema>;

// STAFF (recepción) no tiene acceso a notas clínicas: Ley 8968 clasifica los
// datos de salud como sensibles. El control de acceso debe vivir en la API,
// no solo ocultarse en el cliente sobre datos ya descargados.

@Controller('medical-controls')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class MedicalControlController {
  constructor(
    private readonly createUseCase: CreateMedicalControlUseCase,
    private readonly findAllUseCase: FindAllMedicalControlsUseCase,
    private readonly findOneUseCase: FindOneMedicalControlUseCase,
    private readonly addCorrectionNoteUseCase: AddCorrectionNoteUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateMedicalControlSchema))
  async create(
    @Body() dto: CreateMedicalControlDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalControlEntity> {
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
  ): Promise<PaginatedResponse<MedicalControlEntity>> {
    // La especialidad determina qué se puede crear, nunca qué se puede ver
    // (NOM-004 5.14): un solo expediente con todos los registros del paciente.
    return await this.findAllUseCase.execute(
      patientUUID,
      { tenantUuid: user.tenantUuid },
      { page: Number(page), limit: Number(limit) },
    );
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalControlEntity> {
    return await this.findOneUseCase.execute(uuid, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Patch(':uuid/correction-note')
  @UsePipes(new ZodValidationPipe(CorrectionNoteSchema))
  async addCorrectionNote(
    @Param('uuid') uuid: string,
    @Body() dto: CorrectionNoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MedicalControlEntity> {
    return await this.addCorrectionNoteUseCase.execute(uuid, user.tenantUuid, dto.correctionNotes);
  }
}
