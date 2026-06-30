import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductUnit, ProductUnitStatus } from '@medical-records/domain/types/product.types';
import { CreateProductUnitDto } from '@medical-records/app/dtos/product-unit.dto';

@Injectable()
export class ProductUnitStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): ProductUnit {
    return {
      uuid: row.uuid,
      serialNumber: row.serialNumber,
      status: row.status as ProductUnitStatus,
      purchaseDate: row.purchaseDate ?? undefined,
      warrantyUntil: row.warrantyUntil ?? undefined,
      photoUrl: row.photoUrl ?? undefined,
      notes: row.notes ?? undefined,
      assignedToPatientUuid: row.assignedToPatientUuid ?? undefined,
      assignedAt: row.assignedAt ?? undefined,
      createdAt: row.createdAt,
      patient: row.patient
        ? { uuid: row.patient.uuid, name: `${row.patient.firstName} ${row.patient.lastName}` }
        : undefined,
    };
  }

  async create(productId: number, dto: CreateProductUnitDto): Promise<ProductUnit> {
    const row = await this.prisma.productUnit.create({
      data: {
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate,
        warrantyUntil: dto.warrantyUntil,
        photoUrl: dto.photoUrl,
        notes: dto.notes,
        productId,
      },
    });
    return this.mapToDomain(row);
  }

  async createMany(productId: number, units: CreateProductUnitDto[]): Promise<ProductUnit[]> {
    const created = await Promise.all(units.map((u) => this.create(productId, u)));
    return created;
  }

  async findAllByProduct(productId: number, status?: ProductUnitStatus): Promise<ProductUnit[]> {
    const rows = await this.prisma.productUnit.findMany({
      where: {
        productId,
        ...(status && { status }),
      },
      include: {
        patientDevices: {
          where: { isActive: true },
          include: { patient: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => {
      const activeDevice = row.patientDevices?.[0];
      return this.mapToDomain({
        ...row,
        patient: activeDevice?.patient ?? null,
      });
    });
  }

  async findOne(uuid: string): Promise<ProductUnit | null> {
    const row = await this.prisma.productUnit.findUnique({
      where: { uuid },
      include: {
        patientDevices: {
          where: { isActive: true },
          include: { patient: true },
          take: 1,
        },
      },
    });
    if (!row) return null;
    const activeDevice = row.patientDevices?.[0];
    return this.mapToDomain({ ...row, patient: activeDevice?.patient ?? null });
  }

  async findBySerial(serialNumber: string): Promise<ProductUnit | null> {
    const row = await this.prisma.productUnit.findUnique({ where: { serialNumber } });
    return row ? this.mapToDomain(row) : null;
  }

  async update(uuid: string, data: Partial<Pick<ProductUnit, 'status' | 'warrantyUntil' | 'photoUrl' | 'notes'>>): Promise<ProductUnit> {
    const row = await this.prisma.productUnit.update({
      where: { uuid },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.warrantyUntil !== undefined && { warrantyUntil: data.warrantyUntil }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    return this.mapToDomain(row);
  }

  async assign(uuid: string, patientUuid: string): Promise<void> {
    await this.prisma.productUnit.update({
      where: { uuid },
      data: {
        status: 'ASSIGNED',
        assignedToPatientUuid: patientUuid,
        assignedAt: new Date(),
      },
    });
  }

  async release(uuid: string): Promise<void> {
    await this.prisma.productUnit.update({
      where: { uuid },
      data: {
        status: 'AVAILABLE',
        assignedToPatientUuid: null,
        assignedAt: null,
      },
    });
  }

  async countAvailable(productId: number): Promise<number> {
    return this.prisma.productUnit.count({ where: { productId, status: 'AVAILABLE' } });
  }

  async findRawId(uuid: string): Promise<number | null> {
    const row = await this.prisma.productUnit.findUnique({ where: { uuid }, select: { id: true } });
    return row?.id ?? null;
  }
}
