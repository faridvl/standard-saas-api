import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AudiometryTypeItem } from '@medical-records/domain/entities/patient-audiometry-entry.entity';

/** Catálogo global de tipos de audiometría: no se filtra por clínica. */
@Injectable()
export class AudiometryTypeStorage {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<AudiometryTypeItem[]> {
    return await this.prisma.audiometryType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { code: true, name: true },
    });
  }

  async isActive(code: string): Promise<boolean> {
    const type = await this.prisma.audiometryType.findFirst({
      where: { code, isActive: true },
      select: { id: true },
    });
    return type !== null;
  }
}
