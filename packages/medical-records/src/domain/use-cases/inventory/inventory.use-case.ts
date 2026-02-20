import { ProductDto } from '@medical-records/app/dtos/inventory.dto';
import { Product } from '@medical-records/domain/types/product.types';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProductManagerUseCase {
  constructor(private readonly storage: ProductStorage) {}

  async create(tenantUuid: string, dto: ProductDto): Promise<Product> {
    return await this.storage.create(dto, tenantUuid);
  }

  async update(tenantUuid: string, uuid: string, dto: Partial<ProductDto>): Promise<Product> {
    const exists = await this.storage.findOne(uuid, tenantUuid);
    if (!exists) throw new NotFoundException('Producto no encontrado');

    return await this.storage.update(uuid, tenantUuid, dto);
  }

  async listAll(tenantUuid: string, includeInactive: boolean = false): Promise<Product[]> {
    return await this.storage.findAll(tenantUuid, !includeInactive);
  }

  async getDetail(tenantUuid: string, uuid: string): Promise<Product> {
    const product = await this.storage.findOne(uuid, tenantUuid);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async toggleStatus(tenantUuid: string, uuid: string, status: boolean): Promise<void> {
    await this.storage.toggleStatus(uuid, tenantUuid, status);
  }
}
