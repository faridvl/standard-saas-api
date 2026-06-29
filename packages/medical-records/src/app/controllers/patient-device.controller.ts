import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreatePatientDeviceUseCase } from '@medical-records/domain/use-cases/patient-device/create-patient-device.use-case';
import { FindPatientDevicesUseCase } from '@medical-records/domain/use-cases/patient-device/find-patient-devices.use-case';
import { DeactivatePatientDeviceUseCase } from '@medical-records/domain/use-cases/patient-device/deactivate-patient-device.use-case';
import { CreatePatientDeviceDto, CreatePatientDeviceSchema } from '../dtos/patient-device.dto';

@Controller('patients/:patientUuid/devices')
@UseGuards(AuthGuard)
export class PatientDeviceController {
  constructor(
    private readonly createUseCase: CreatePatientDeviceUseCase,
    private readonly findUseCase: FindPatientDevicesUseCase,
    private readonly deactivateUseCase: DeactivatePatientDeviceUseCase,
  ) {}

  @Get()
  async findAll(@Param('patientUuid') patientUuid: string, @CurrentUser() user: JwtPayload) {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientDeviceSchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientDeviceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.createUseCase.execute({ ...dto, patientUuid, tenantUuid: user.tenantUuid });
  }

  @Delete(':deviceUuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('deviceUuid') deviceUuid: string, @CurrentUser() user: JwtPayload) {
    await this.deactivateUseCase.execute(deviceUuid, user.tenantUuid);
  }
}
