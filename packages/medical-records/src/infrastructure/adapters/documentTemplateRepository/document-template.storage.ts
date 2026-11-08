import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, DocumentTemplate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DocumentTemplateEntity,
  DocumentTemplateSummary,
  DocumentTemplateWriteData,
} from '@medical-records/domain/entities/document-template.entity';

const UNIQUE_VIOLATION_CODE = 'P2002';
export const DUPLICATE_DOCUMENT_TEMPLATE_MESSAGE = 'Ya existe una plantilla con ese nombre';

@Injectable()
export class DocumentTemplateStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(row: DocumentTemplate): DocumentTemplateEntity {
    return {
      uuid: row.uuid,
      name: row.name,
      description: row.description,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // El índice único (tenantUuid, lower(name)) cubre la carrera entre dos guardados a la vez.
  private rethrowDuplicate(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION_CODE
    ) {
      throw new ConflictException(DUPLICATE_DOCUMENT_TEMPLATE_MESSAGE);
    }
    throw error;
  }

  async findAll(tenantUuid: string): Promise<DocumentTemplateSummary[]> {
    const rows = await this.prisma.documentTemplate.findMany({
      where: { tenantUuid },
      select: { uuid: true, name: true, description: true, updatedAt: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      uuid: row.uuid,
      name: row.name,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async findByUuid(uuid: string, tenantUuid: string): Promise<DocumentTemplateEntity | null> {
    const row = await this.prisma.documentTemplate.findFirst({ where: { uuid, tenantUuid } });
    return row ? this.mapToEntity(row) : null;
  }

  async nameExists(tenantUuid: string, name: string, exceptUuid?: string): Promise<boolean> {
    const row = await this.prisma.documentTemplate.findFirst({
      where: {
        tenantUuid,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptUuid && { uuid: { not: exceptUuid } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  async create(
    tenantUuid: string,
    actorUuid: string,
    data: DocumentTemplateWriteData,
  ): Promise<DocumentTemplateEntity> {
    try {
      const row = await this.prisma.documentTemplate.create({
        data: { tenantUuid, ...data, createdByUuid: actorUuid, updatedByUuid: actorUuid },
      });
      return this.mapToEntity(row);
    } catch (error) {
      return this.rethrowDuplicate(error);
    }
  }

  // Filtra por tenant también al escribir; null si la plantilla no es de la clínica.
  async update(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    data: DocumentTemplateWriteData,
  ): Promise<DocumentTemplateEntity | null> {
    try {
      const { count } = await this.prisma.documentTemplate.updateMany({
        where: { uuid, tenantUuid },
        data: { ...data, updatedByUuid: actorUuid, updatedAt: new Date() },
      });
      if (count === 0) return null;
    } catch (error) {
      return this.rethrowDuplicate(error);
    }
    return await this.findByUuid(uuid, tenantUuid);
  }
}
