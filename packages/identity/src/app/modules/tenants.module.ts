import { Module } from '@nestjs/common';
import { TenantController } from '../controllers/tenant.controller';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';
import { TenantStorage } from '../../infrastructure/adapters/tenant.storage';

const CONTROLLERS = [TenantController];
const USE_CASES = [UpdateTenantUseCase];
const STORAGES = [TenantStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class TenantsModule {}
