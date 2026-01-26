import { Injectable } from '@nestjs/common';
import { IOwner } from '../../domain/entities/owner.entity';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class OwnerStorage {
  // Inyectamos el servicio central en lugar de crear un "new PrismaClient"
  constructor(private readonly prisma: PrismaService) {}

  async save(owner: IOwner): Promise<IOwner> {
    try {
      // Usamos el cliente inyectado para la transacción
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Crear el Tenant
        const dbTenant = await tx.tenant.create({
          data: {
            uuid: owner.uuid,
            businessName: owner.businessName,
          },
        });

        // 2. Crear el Usuario asociado
        const dbUser = await tx.user.create({
          data: {
            email: owner.email,
            password: owner.password,
            tenantId: dbTenant.id,
          },
        });

        return { dbTenant, dbUser };
      });

      // 3. Mapeo explícito de salida (Desacoplamiento)
      return {
        uuid: result.dbTenant.uuid,
        businessName: result.dbTenant.businessName,
        email: result.dbUser.email,
        password: result.dbUser.password,
        createdAt: result.dbTenant.createdAt,
      };
    } catch (error) {
      console.error('Error en OwnerStorage persistence:', error);
      // Lanzamos el error para que el UseCase o el Filter de Nest lo capturen
      throw error;
    }
  }
}
