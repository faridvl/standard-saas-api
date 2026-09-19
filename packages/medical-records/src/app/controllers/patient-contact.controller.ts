import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  CreatePatientContactDto,
  CreatePatientContactSchema,
  SyncPatientContactsDto,
  SyncPatientContactsSchema,
} from '@medical-records/app/dtos/patient-contact.dto';
import { CreatePatientContactUseCase } from '@medical-records/domain/use-cases/patient-contacts/create-patient-contact.use-case';
import { FindPatientContactsUseCase } from '@medical-records/domain/use-cases/patient-contacts/find-patient-contacts.use-case';
import { DeletePatientContactUseCase } from '@medical-records/domain/use-cases/patient-contacts/delete-patient-contact.use-case';
import { SyncPatientContactsUseCase } from '@medical-records/domain/use-cases/patient-contacts/sync-patient-contacts.use-case';
import { PatientContact } from '@prisma/client';

@Controller('patients/:patientUuid/contacts')
@UseGuards(AuthGuard)
export class PatientContactController {
  constructor(
    private readonly createUseCase: CreatePatientContactUseCase,
    private readonly findUseCase: FindPatientContactsUseCase,
    private readonly deleteUseCase: DeletePatientContactUseCase,
    private readonly syncUseCase: SyncPatientContactsUseCase,
  ) {}

  @Get()
  async findAll(@Param('patientUuid') patientUuid: string, @CurrentUser() user: JwtPayload): Promise<PatientContact[]> {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientContactSchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientContactDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientContact> {
    return await this.createUseCase.execute({
      patientUuid,
      tenantUuid: user.tenantUuid,
      name: dto.name,
      phone: dto.phone,
    });
  }

  @Put()
  @UsePipes(new ZodValidationPipe(SyncPatientContactsSchema))
  async sync(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: SyncPatientContactsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientContact[]> {
    return await this.syncUseCase.execute(patientUuid, user.tenantUuid, dto.contacts);
  }

  @Delete(':contactUuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('contactUuid') contactUuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.deleteUseCase.execute(contactUuid, user.tenantUuid);
  }
}
