import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { CreateProductUnitDto } from '@medical-records/app/dtos/product-unit.dto';
import { ProductUnit } from '@medical-records/domain/types/product.types';

@Injectable()
export class CreateProductUnitsBulkUseCase {
  constructor(
    private readonly unitStorage: ProductUnitStorage,
    private readonly productStorage: ProductStorage,
  ) {}

  async execute(productUuid: string, tenantUuid: string, units: CreateProductUnitDto[]): Promise<ProductUnit[]> {
    const product = await this.productStorage.findOne(productUuid, tenantUuid);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const serials = units.map((u) => u.serialNumber);
    const duplicatesInRequest = serials.filter((s, i) => serials.indexOf(s) !== i);
    if (duplicatesInRequest.length > 0) {
      throw new ConflictException(`Seriales duplicados en la solicitud: ${duplicatesInRequest.join(', ')}`);
    }

    const existingChecks = await Promise.all(units.map((u) => this.unitStorage.findBySerial(u.serialNumber)));
    const alreadyExisting = existingChecks.filter(Boolean).map((u) => u!.serialNumber);
    if (alreadyExisting.length > 0) {
      throw new ConflictException(`Los siguientes números de serie ya existen: ${alreadyExisting.join(', ')}`);
    }

    const productId = await this.productStorage.findRawId(productUuid);
    return this.unitStorage.createMany(productId!, units);
  }
}
