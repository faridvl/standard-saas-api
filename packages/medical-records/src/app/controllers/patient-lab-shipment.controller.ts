import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AnyLevel } from '@medical-records/app/decorators/access.decorators';
import { PatientLabShipmentEntity } from '@medical-records/domain/entities/patient-lab-shipment.entity';
import { FindPatientLabShipmentsUseCase } from '@medical-records/domain/use-cases/patient-lab-shipments';

/**
 * Historial de envíos al laboratorio. Mismo alcance que el interruptor de laboratorio
 * (PUT /patients/:uuid/flags): cualquier nivel. La nota de la entrega solo la ve
 * quien atiende pacientes (queda también en Control de evolución).
 */
@Controller('patients/:patientUuid/lab-shipments')
@UseGuards(AuthGuard, AccessGuard)
@AnyLevel()
export class PatientLabShipmentController {
  constructor(private readonly findUseCase: FindPatientLabShipmentsUseCase) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientLabShipmentEntity[]> {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid, user.attendsPatients);
  }
}
