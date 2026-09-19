import { Module } from '@nestjs/common';
import { ProductUnitController } from '../controllers/product-unit.controller';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import {
  CreateProductUnitUseCase,
  CreateProductUnitsBulkUseCase,
  FindProductUnitsUseCase,
  FindOneProductUnitUseCase,
  UpdateProductUnitUseCase,
} from '@medical-records/domain/use-cases/product-unit';
import { InventoryModule } from './inventory.module';

const CONTROLLERS = [ProductUnitController];
const USE_CASES = [
  CreateProductUnitUseCase,
  CreateProductUnitsBulkUseCase,
  FindProductUnitsUseCase,
  FindOneProductUnitUseCase,
  UpdateProductUnitUseCase,
];
const STORAGES = [ProductUnitStorage];

@Module({
  imports: [InventoryModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class ProductUnitModule {}
