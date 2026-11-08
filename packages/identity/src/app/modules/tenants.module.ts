import { Module } from '@nestjs/common';
import { TenantController } from '../controllers/tenant.controller';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { GetClinicUseCase } from '../../domain/use-cases/clinic/get-clinic.use-case';
import { UpdateClinicContactUseCase } from '../../domain/use-cases/clinic/update-clinic-contact.use-case';
import { TenantStorage } from '../../infrastructure/adapters/tenant.storage';

const CONTROLLERS = [TenantController];
const USE_CASES = [UpdateTenantUseCase, GetClinicUseCase, UpdateClinicContactUseCase];
const STORAGES = [TenantStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class TenantsModule {}
