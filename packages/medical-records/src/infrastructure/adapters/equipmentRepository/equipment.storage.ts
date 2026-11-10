import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { EQUIPMENT_ALREADY_EXISTS_CODE } from '@medical-records/domain/utils/equipment.util';

const EQUIPMENT_SELECT = {
  uuid: true,
  brand: true,
  model: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface EquipmentUpdateData {
  brand?: string;
  model?: string;
  isActive?: boolean;
}

// El índice único de marca + modelo es el respaldo de la validación del use case ante dos
// peticiones simultáneas.
function rethrowIfDuplicate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException({
      message: 'Ya existe un equipo con esa marca y modelo',
      code: EQUIPMENT_ALREADY_EXISTS_CODE,
    });
  }
  throw error;
}

@Injectable()
export class EquipmentStorage {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los equipos de la clínica, activos e inactivos; el orden final lo da el use case. */
  async findAll(tenantUuid: string): Promise<EquipmentEntity[]> {
    return await this.prisma.clinicEquipment.findMany({
      where: { tenantUuid },
      select: EQUIPMENT_SELECT,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });
  }

  async findByUuid(tenantUuid: string, uuid: string): Promise<EquipmentEntity | null> {
    return await this.prisma.clinicEquipment.findFirst({
      where: { uuid, tenantUuid },
      select: EQUIPMENT_SELECT,
    });
  }

  async create(
    tenantUuid: string,
    data: { brand: string; model: string },
  ): Promise<EquipmentEntity> {
    try {
      return await this.prisma.clinicEquipment.create({
        data: { ...data, tenantUuid },
        select: EQUIPMENT_SELECT,
      });
    } catch (error) {
      return rethrowIfDuplicate(error);
    }
  }

  /** Filtra por clínica también al escribir; null si el equipo no es de la clínica. */
  async update(
    tenantUuid: string,
    uuid: string,
    data: EquipmentUpdateData,
  ): Promise<EquipmentEntity | null> {
    try {
      const { count } = await this.prisma.clinicEquipment.updateMany({
        where: { uuid, tenantUuid },
        data,
      });
      if (count === 0) return null;
    } catch (error) {
      return rethrowIfDuplicate(error);
    }
    return await this.findByUuid(tenantUuid, uuid);
  }
}
