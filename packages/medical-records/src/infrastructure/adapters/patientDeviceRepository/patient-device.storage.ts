import { Injectable } from '@nestjs/common';
import { Prisma, PatientDevice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PatientDeviceWithProductUnit = Prisma.PatientDeviceGetPayload<{
  include: {
    productUnit: {
      include: {
        product: {
          select: { uuid: true; name: true; brand: true; model: true };
        };
      };
    };
  };
}>;

@Injectable()
export class PatientDeviceStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientUuid: string;
    tenantUuid: string;
    side: string;
    productUnitId: number;
    notes?: string;
  }): Promise<PatientDeviceWithProductUnit> {
    return this.prisma.patientDevice.create({
      data: {
        patient: { connect: { uuid: data.patientUuid } },
        tenantUuid: data.tenantUuid,
        side: data.side,
        productUnit: { connect: { id: data.productUnitId } },
        notes: data.notes,
      },
      include: this.includeProductUnit(),
    });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<PatientDeviceWithProductUnit[]> {
    return this.prisma.patientDevice.findMany({
      where: { patientUuid, tenantUuid, isActive: true },
      include: this.includeProductUnit(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(uuid: string): Promise<PatientDeviceWithProductUnit | null> {
    return this.prisma.patientDevice.findUnique({
      where: { uuid },
      include: this.includeProductUnit(),
    });
  }

  async deactivate(uuid: string, tenantUuid: string): Promise<PatientDevice> {
    return this.prisma.patientDevice.update({
      where: { uuid },
      data: { isActive: false },
    });
  }

  private includeProductUnit() {
    return {
      productUnit: {
        include: {
          product: {
            select: { uuid: true, name: true, brand: true, model: true },
          },
        },
      },
    };
  }
}
