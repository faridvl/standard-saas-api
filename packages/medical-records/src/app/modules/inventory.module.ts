import { Module } from '@nestjs/common';
import { ProductController } from '../controllers/inventory.controller';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { ProductManagerUseCase } from '@medical-records/domain/use-cases/inventory';

const CONTROLLERS = [ProductController];
const USE_CASES = [ProductManagerUseCase];
const STORAGES = [ProductStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class InventoryModule {}
