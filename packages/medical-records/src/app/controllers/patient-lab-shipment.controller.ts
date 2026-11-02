import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { PatientLabShipmentEntity } from '@medical-records/domain/entities/patient-lab-shipment.entity';
import { FindPatientLabShipmentsUseCase } from '@medical-records/domain/use-cases/patient-lab-shipments';

/**
 * Historial de envíos al laboratorio. Mismo alcance que el interruptor de laboratorio
 * (PUT /patients/:uuid/flags): cualquier rol de la clínica.
 */
@Controller('patients/:patientUuid/lab-shipments')
@UseGuards(AuthGuard)
export class PatientLabShipmentController {
  constructor(private readonly findUseCase: FindPatientLabShipmentsUseCase) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientLabShipmentEntity[]> {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }
}
