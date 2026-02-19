import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';

// Use Cases
import { CreateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/create-appointment.use-case';
import { GetAppointmentsUseCase } from '@medical-records/domain/use-cases/appointments/find-all-appointment.use-case';
import { FindOneAppointment } from '@medical-records/domain/use-cases/appointments/find-one-appointment.use-case';
import { UpdateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/update-appointment.use-case';

// DTOs
import {
  CreateAppointmentDto,
  CreateAppointmentSchema,
  UpdateAppointmentDto,
  UpdateAppointmentSchema,
} from '@medical-records/app/dtos/appointment.dto';
import { GetAppointmentsByPatientUseCase } from '@medical-records/domain/use-cases/appointments/find-byPatient-appointment.use-case';

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentController {
  constructor(
    private readonly createUseCase: CreateAppointmentUseCase,
    private readonly getAllUseCase: GetAppointmentsUseCase,
    private readonly getOneUseCase: FindOneAppointment,
    private readonly updateUseCase: UpdateAppointmentUseCase,
    private readonly getAppointmentsByPatientUseCase: GetAppointmentsByPatientUseCase,
    // private readonly deleteUseCase: DeleteAppointmentUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateAppointmentSchema))
  async create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(user.tenantUuid, {
      ...dto,
      userUUID: user.sub,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
    @Query('patientId') patientId?: string,
  ) {
    return await this.getAllUseCase.execute(user.tenantUuid, {
      page,
      limit,
      date,
      patientId,
    });
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.getOneUseCase.execute(uuid, user.tenantUuid);
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdateAppointmentSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.updateUseCase.execute(uuid, user.tenantUuid, dto);
  }
  @Get('patient/:patientUUID')
  async getByPatient(@Param('patientUUID') patientUUID: string, @CurrentUser() user: JwtPayload) {
    // Invocamos el Use Case que orquesta la búsqueda de citas e info del paciente
    return await this.getAppointmentsByPatientUseCase.execute(patientUUID, user.tenantUuid);
  }

  //   @Delete(':uuid')
  //   async delete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
  //     return await this.deleteUseCase.execute(uuid, user.tenantUuid);
  //   }
}
