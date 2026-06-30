import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '@medical-records/domain/types/product.types';

@Injectable()
export class ProductStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): Product {
    const availableCount =
      row._count?.units !== undefined
        ? row._count.units
        : (row.units?.filter((u: any) => u.status === 'AVAILABLE').length ?? 0);

    return {
      uuid: row.uuid,
      tenantUuid: row.tenantUuid,
      sku: row.sku,
      name: row.name,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      description: row.description ?? undefined,
      price: Number(row.price),
      stock: {
        current: availableCount,
        min: row.minStock,
      },
      cabysCode: row.cabysCode ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async create(data: Partial<Product>, tenantUuid: string): Promise<Product> {
    const row = await this.prisma.product.create({
      data: {
        sku: data.sku!,
        name: data.name!,
        brand: data.brand,
        model: data.model,
        description: data.description,
        price: data.price || 0,
        minStock: data.stock?.min ?? 5,
        cabysCode: data.cabysCode,
        tenantUuid: tenantUuid,
        isActive: true,
      },
      include: { _count: { select: { units: { where: { status: 'AVAILABLE' } } } } },
    });
    return this.mapToDomain(row);
  }

  async update(uuid: string, tenantUuid: string, data: Partial<Product>): Promise<Product> {
    const row = await this.prisma.product.update({
      where: { uuid, tenantUuid },
      data: {
        name: data.name,
        brand: data.brand,
        model: data.model,
        description: data.description,
        price: data.price,
        minStock: data.stock?.min,
        cabysCode: data.cabysCode,
        isActive: data.isActive,
      },
      include: { _count: { select: { units: { where: { status: 'AVAILABLE' } } } } },
    });
    return this.mapToDomain(row);
  }

  async findAll(tenantUuid: string, onlyActive: boolean = true): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        tenantUuid,
        ...(onlyActive && { isActive: true }),
      },
      include: { _count: { select: { units: { where: { status: 'AVAILABLE' } } } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findOne(uuid: string, tenantUuid: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({
      where: { uuid, tenantUuid },
      include: { _count: { select: { units: { where: { status: 'AVAILABLE' } } } } },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findById(id: number): Promise<{ id: number; uuid: string; tenantUuid: string } | null> {
    return this.prisma.product.findUnique({ where: { id }, select: { id: true, uuid: true, tenantUuid: true } });
  }

  async findRawId(uuid: string): Promise<number | null> {
    const row = await this.prisma.product.findUnique({ where: { uuid }, select: { id: true } });
    return row?.id ?? null;
  }

  async toggleStatus(uuid: string, tenantUuid: string, status: boolean): Promise<void> {
    await this.prisma.product.update({
      where: { uuid, tenantUuid },
      data: { isActive: status },
    });
  }
}
