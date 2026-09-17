import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientContactData {
  patientUuid: string;
  tenantUuid: string;
  name: string;
  phone: string;
}

@Injectable()
export class PatientContactStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePatientContactData) {
    return await this.prisma.patientContact.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string) {
    return await this.prisma.patientContact.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(uuid: string, tenantUuid: string) {
    return await this.prisma.patientContact.delete({
      where: { uuid, tenantUuid },
    });
  }
}
