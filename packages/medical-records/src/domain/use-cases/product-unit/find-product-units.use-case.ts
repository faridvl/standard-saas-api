import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { ProductUnit, ProductUnitStatus } from '@medical-records/domain/types/product.types';

@Injectable()
export class FindProductUnitsUseCase {
  constructor(
    private readonly unitStorage: ProductUnitStorage,
    private readonly productStorage: ProductStorage,
  ) {}

  async execute(productUuid: string, tenantUuid: string, status?: ProductUnitStatus): Promise<ProductUnit[]> {
    const product = await this.productStorage.findOne(productUuid, tenantUuid);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const productId = await this.productStorage.findRawId(productUuid);
    return this.unitStorage.findAllByProduct(productId!, status);
  }
}
