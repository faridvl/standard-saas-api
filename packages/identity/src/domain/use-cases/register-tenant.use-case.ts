import { Injectable, ConflictException } from '@nestjs/common';
import { AppLogger } from '@project/core';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/adapters/prisma/prisma.service';
import { TenantStorage } from '../../infrastructure/adapters/tenant.storage';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { RegisterTenantDto } from '../dtos/register-tenant.dto';
import { IRegistrationResult } from '../dtos/registration-result.interface';
import { BcryptService } from '../../infrastructure/security/bcrypt.service';

@Injectable()
export class RegisterTenantUseCase {
  private readonly logger = new AppLogger();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantStorage: TenantStorage,
    private readonly userStorage: UserStorage,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(dto: RegisterTenantDto): Promise<IRegistrationResult> {
    this.logger.log('Iniciando registro coordinado', { email: dto.email });

    // 1. Validación previa (Fuera de la transacción para no bloquear la DB)
    const userExists = await this.userStorage.findByEmail(dto.email);
    if (userExists) throw new ConflictException('Email ya registrado');
    const hashedPassword = await this.bcryptService.hash(dto.password);

    try {
      // El Use Case decide que estas dos acciones son una sola unidad de negocio
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const tenant = await this.tenantStorage.create(
          {
            businessName: dto.businessName,
            businessType: dto.businessType,
            status: 'ACTIVE',
          },
          tx,
        );

        const user = await this.userStorage.create(
          {
            email: dto.email,
            name: dto.ownerName,
            password: hashedPassword,
            role: 'OWNER',
            status: 'ACTIVE',
            tenant: { connect: { id: tenant.id } },
          },
          tx,
        );

        return { tenant, user };
      });

      return {
        tenantUuid: result.tenant.uuid,
        userUuid: result.user.uuid,
        email: result.user.email,
        status: result.tenant.status,
      };
    } catch (error) {
      this.logger.error(
        'Error en el registro atómico',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
