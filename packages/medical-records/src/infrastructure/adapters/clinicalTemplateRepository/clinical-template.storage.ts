import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClinicalTemplateEntity,
  ClinicalFieldDefinition,
} from '@medical-records/domain/entities/clinical-template.entity';
import {
  CreateClinicalTemplateDto,
  UpdateClinicalTemplateDto,
} from '@medical-records/app/dtos/clinical-template.dto';

@Injectable()
export class ClinicalTemplateStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: {
    uuid: string;
    tenantUuid: string;
    name: string;
    speciality: string;
    fields: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ClinicalTemplateEntity {
    return {
      uuid: row.uuid,
      tenantUuid: row.tenantUuid,
      name: row.name,
      speciality: row.speciality,
      fields: row.fields as ClinicalFieldDefinition[],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(tenantUuid: string, dto: CreateClinicalTemplateDto): Promise<ClinicalTemplateEntity> {
    const row = await this.prisma.clinicalTemplate.create({
      data: {
        tenantUuid,
        name: dto.name,
        speciality: dto.speciality,
        fields: dto.fields as object[],
      },
    });
    return this.mapToDomain(row);
  }

  async findAll(tenantUuid: string): Promise<ClinicalTemplateEntity[]> {
    const rows = await this.prisma.clinicalTemplate.findMany({
      where: { tenantUuid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async findByUuid(uuid: string, tenantUuid: string): Promise<ClinicalTemplateEntity | null> {
    const row = await this.prisma.clinicalTemplate.findFirst({
      where: { uuid, tenantUuid },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findBySpeciality(tenantUuid: string, speciality: string): Promise<ClinicalTemplateEntity | null> {
    const row = await this.prisma.clinicalTemplate.findFirst({
      where: { tenantUuid, speciality },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async update(uuid: string, tenantUuid: string, dto: UpdateClinicalTemplateDto): Promise<ClinicalTemplateEntity> {
    const existing = await this.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Plantilla clínica con UUID ${uuid} no encontrada`);
    }

    const row = await this.prisma.clinicalTemplate.update({
      where: { uuid },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.speciality !== undefined && { speciality: dto.speciality }),
        ...(dto.fields !== undefined && { fields: dto.fields as object[] }),
      },
    });
    return this.mapToDomain(row);
  }

  async delete(uuid: string, tenantUuid: string): Promise<void> {
    const existing = await this.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Plantilla clínica con UUID ${uuid} no encontrada`);
    }
    await this.prisma.clinicalTemplate.delete({ where: { uuid } });
  }
}
