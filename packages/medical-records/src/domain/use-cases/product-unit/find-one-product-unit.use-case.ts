import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { ProductUnit } from '@medical-records/domain/types/product.types';

@Injectable()
export class FindOneProductUnitUseCase {
  constructor(private readonly unitStorage: ProductUnitStorage) {}

  async execute(uuid: string): Promise<ProductUnit> {
    const unit = await this.unitStorage.findOne(uuid);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }
}
