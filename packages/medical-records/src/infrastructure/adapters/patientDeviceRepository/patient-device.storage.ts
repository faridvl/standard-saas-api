import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PatientDeviceStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PatientDeviceCreateInput) {
    return await this.prisma.patientDevice.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string) {
    return await this.prisma.patientDevice.findMany({
      where: { patientUuid, tenantUuid, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(uuid: string, tenantUuid: string, data: Prisma.PatientDeviceUpdateInput) {
    return await this.prisma.patientDevice.update({
      where: { uuid },
      data,
    });
  }

  async deactivate(uuid: string, tenantUuid: string) {
    return await this.prisma.patientDevice.update({
      where: { uuid },
      data: { isActive: false },
    });
  }
}
