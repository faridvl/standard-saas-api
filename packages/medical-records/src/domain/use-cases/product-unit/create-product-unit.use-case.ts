import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { CreateProductUnitDto } from '@medical-records/app/dtos/product-unit.dto';
import { ProductUnit } from '@medical-records/domain/types/product.types';

@Injectable()
export class CreateProductUnitUseCase {
  constructor(
    private readonly unitStorage: ProductUnitStorage,
    private readonly productStorage: ProductStorage,
  ) {}

  async execute(productUuid: string, tenantUuid: string, dto: CreateProductUnitDto): Promise<ProductUnit> {
    const product = await this.productStorage.findOne(productUuid, tenantUuid);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const existing = await this.unitStorage.findBySerial(dto.serialNumber);
    if (existing) throw new ConflictException(`El número de serie "${dto.serialNumber}" ya existe en el sistema`);

    const productId = await this.productStorage.findRawId(productUuid);
    return this.unitStorage.create(productId!, dto);
  }
}
