import { Injectable } from '@nestjs/common';
import { MaintenanceStatus, PatientMaintenanceNote } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientMaintenanceNoteData {
  patientUuid: string;
  tenantUuid: string;
  number: number;
  text: string;
  createdByUuid: string;
}

@Injectable()
export class PatientMaintenanceNoteStorage {
  constructor(private readonly prisma: PrismaService) {}

  async patientExists(patientUuid: string, tenantUuid: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid, deletedAt: null },
      select: { id: true },
    });
    return patient !== null;
  }

  /** Estado actual de los cuatro mantenimientos, en orden; null si el paciente no existe. */
  async findStatuses(patientUuid: string, tenantUuid: string): Promise<MaintenanceStatus[] | null> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid, deletedAt: null },
      select: {
        maintenance1Status: true,
        maintenance2Status: true,
        maintenance3Status: true,
        maintenance4Status: true,
      },
    });
    if (!patient) return null;
    return [
      patient.maintenance1Status,
      patient.maintenance2Status,
      patient.maintenance3Status,
      patient.maintenance4Status,
    ];
  }

  async create(data: CreatePatientMaintenanceNoteData): Promise<PatientMaintenanceNote> {
    return await this.prisma.patientMaintenanceNote.create({ data });
  }

  async findAllByPatient(
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientMaintenanceNote[]> {
    return await this.prisma.patientMaintenanceNote.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
