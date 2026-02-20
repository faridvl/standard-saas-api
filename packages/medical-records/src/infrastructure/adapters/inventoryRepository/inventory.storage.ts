import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '@medical-records/domain/types/product.types';

@Injectable()
export class ProductStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): Product {
    return {
      uuid: row.uuid,
      tenantUuid: row.tenantUuid,
      sku: row.sku,
      name: row.name,
      model: row.model,
      description: row.description,
      price: Number(row.price),
      stock: {
        current: row.currentStock,
        min: row.minStock,
      },
      cabysCode: row.cabysCode,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async create(data: Partial<Product>, tenantUuid: string): Promise<Product> {
    const row = await this.prisma.product.create({
      data: {
        sku: data.sku!,
        name: data.name!,
        model: data.model,
        description: data.description,
        price: data.price || 0,
        currentStock: data.stock?.current || 0,
        minStock: data.stock?.min || 5,
        cabysCode: data.cabysCode,
        tenantUuid: tenantUuid,
        isActive: true,
      },
    });
    return this.mapToDomain(row);
  }

  async update(uuid: string, tenantUuid: string, data: Partial<Product>): Promise<Product> {
    const row = await this.prisma.product.update({
      where: { uuid, tenantUuid },
      data: {
        name: data.name,
        model: data.model,
        description: data.description,
        price: data.price,
        currentStock: data.stock?.current,
        minStock: data.stock?.min,
        cabysCode: data.cabysCode,
        isActive: data.isActive,
      },
    });
    return this.mapToDomain(row);
  }

  async findAll(tenantUuid: string, onlyActive: boolean = true): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        tenantUuid,
        ...(onlyActive && { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.mapToDomain);
  }

  async findOne(uuid: string, tenantUuid: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({
      where: { uuid, tenantUuid },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async toggleStatus(uuid: string, tenantUuid: string, status: boolean): Promise<void> {
    await this.prisma.product.update({
      where: { uuid, tenantUuid },
      data: { isActive: status },
    });
  }
}
