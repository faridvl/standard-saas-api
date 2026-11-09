import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
import {
  CreatePatientMaintenanceNoteDto,
  CreatePatientMaintenanceNoteSchema,
  MaintenanceNumberSchema,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';
import {
  PatientMaintenanceEntity,
  PatientMaintenanceNoteEntity,
} from '@medical-records/domain/entities/patient-maintenance.entity';
import {
  CreatePatientMaintenanceNoteUseCase,
  FindPatientMaintenancesUseCase,
} from '@medical-records/domain/use-cases/patient-maintenance-notes';

/** Estado e historial de notas de los mantenimientos; el estado se cambia con PUT /patients/:uuid/maintenances/:number. */
@Controller('patients/:uuid/maintenances')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class PatientMaintenanceController {
  constructor(
    private readonly findUseCase: FindPatientMaintenancesUseCase,
    private readonly createNoteUseCase: CreatePatientMaintenanceNoteUseCase,
  ) {}

  @Get()
  async findAll(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientMaintenanceEntity[]> {
    return await this.findUseCase.execute(uuid, user.tenantUuid);
  }

  @Post(':number/notes')
  @UsePipes(new ZodValidationPipe(CreatePatientMaintenanceNoteSchema))
  async createNote(
    @Param('uuid') uuid: string,
    @Param('number') number: string,
    @Body() dto: CreatePatientMaintenanceNoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientMaintenanceNoteEntity> {
    const parsedNumber = MaintenanceNumberSchema.safeParse(number);
    if (!parsedNumber.success) {
      throw new BadRequestException(parsedNumber.error.issues[0].message);
    }
    return await this.createNoteUseCase.execute(
      uuid,
      user.tenantUuid,
      user.sub,
      parsedNumber.data,
      dto,
    );
  }
}
