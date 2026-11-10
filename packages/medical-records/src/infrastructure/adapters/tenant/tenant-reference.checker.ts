import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Los ids que llegan en el cuerpo de un POST no pasan por el interceptor de ruta: cada uno se
 * verifica contra la clínica de la sesión y, si es de otra, responde 404 como si no existiera.
 */
@Injectable()
export class TenantReferenceChecker {
  constructor(private readonly prisma: PrismaService) {}

  async assertPatient(uuid: string, tenantUuid: string): Promise<void> {
    const total = await this.prisma.patient.count({ where: { uuid, tenantUuid } });
    if (total === 0) throw new NotFoundException('Paciente no encontrado');
  }

  async assertEncounter(uuid: string | null | undefined, tenantUuid: string): Promise<void> {
    if (!uuid) return;
    const total = await this.prisma.encounter.count({ where: { uuid, tenantUuid } });
    if (total === 0) throw new NotFoundException('Encuentro no encontrado');
  }

  async assertDevice(uuid: string | null | undefined, tenantUuid: string): Promise<void> {
    if (!uuid) return;
    const total = await this.prisma.patientDevice.count({ where: { uuid, tenantUuid } });
    if (total === 0) throw new NotFoundException('Dispositivo no encontrado');
  }

  async assertAppointment(uuid: string | null | undefined, tenantUuid: string): Promise<void> {
    if (!uuid) return;
    const total = await this.prisma.appointment.count({ where: { uuid, tenantUUID: tenantUuid } });
    if (total === 0) throw new NotFoundException('Cita no encontrada');
  }

  async assertDocument(uuid: string | null | undefined, tenantUuid: string): Promise<void> {
    if (!uuid) return;
    const total = await this.prisma.patientDocument.count({ where: { uuid, tenantUuid } });
    if (total === 0) throw new NotFoundException('Documento no encontrado');
  }
}
