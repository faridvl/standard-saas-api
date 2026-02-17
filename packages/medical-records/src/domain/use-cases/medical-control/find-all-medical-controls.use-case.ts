import { MedicalControlEntity } from '@medical-records/domain/entities/medical-control.entity';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

@Injectable()
export class FindAllMedicalControlsUseCase {
  constructor(private readonly storage: MedicalControlStorage) {}

  async execute(
    patientUuid: string,
    context: { tenantUuid: string },
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResponse<MedicalControlEntity>> {
    // Aquí  verificar
    // si el paciente existe o si el usuario tiene permisos sobre este paciente.

    return await this.storage.findAllByPatient(
      patientUuid,
      context.tenantUuid,
      pagination.page,
      pagination.limit,
    );
  }
}
