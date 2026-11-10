import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
import { CreateStudyUseCase } from '@medical-records/domain/use-cases/studies/create-study.use-case';
import { FindByPatientStudyUseCase } from '@medical-records/domain/use-cases/studies/find-by-patient-study.use-case';
import { FindOneStudyUseCase } from '@medical-records/domain/use-cases/studies/find-one-study.use-case';
import { CreateStudyDto, CreateStudySchema } from '../dtos/study.dto';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';

// STAFF (recepción) no tiene acceso a estudios clínicos: Ley 8968 clasifica los
// datos de salud como sensibles. Mismo criterio que EncounterController.

@Controller('studies')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class StudyController {
  constructor(
    private readonly createUseCase: CreateStudyUseCase,
    private readonly findByPatientUseCase: FindByPatientStudyUseCase,
    private readonly findOneUseCase: FindOneStudyUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateStudySchema))
  async create(@Body() dto: CreateStudyDto, @CurrentUser() user: JwtPayload): Promise<StudyEntity> {
    return this.createUseCase.execute(dto, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Get('patient/:uuid')
  async findByPatient(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudyEntity[]> {
    return this.findByPatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudyEntity> {
    return this.findOneUseCase.execute(uuid, user.tenantUuid);
  }
}
