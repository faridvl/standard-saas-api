import { Injectable, ConflictException } from '@nestjs/common';
import { AppLogger } from '@project/core';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/adapters/prisma/prisma.service';
import { TenantStorage } from '../../infrastructure/adapters/tenant.storage';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { RegisterTenantDto } from '../dtos/register-tenant.dto';
import { IRegistrationResult } from '../dtos/registration-result.interface';
import { BcryptService } from '../../infrastructure/security/bcrypt.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegisterTenantUseCase {
  private readonly logger = new AppLogger();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantStorage: TenantStorage,
    private readonly userStorage: UserStorage,
    private readonly bcryptService: BcryptService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RegisterTenantDto): Promise<IRegistrationResult> {
    this.logger.log('Iniciando registro coordinado', { email: dto.email });

    const userExists = await this.userStorage.findByEmail(dto.email);
    if (userExists) throw new ConflictException('Email ya registrado');
    const hashedPassword = await this.bcryptService.hash(dto.password);

    try {
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
            tenantUUID: tenant.uuid,
            ...(dto.phone && { phoneNumber: dto.phone }),
            ...(dto.isSpecialist && dto.specialty && { specialty: dto.specialty }),
          },
          tx,
        );

        return { tenant, user };
      });

      void this.initializeTenantData(result.tenant.uuid);

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

  private async initializeTenantData(tenantUuid: string): Promise<void> {
    const medicalRecordsUrl =
      this.configService.get<string>('MEDICAL_RECORDS_API_URL') ?? 'http://localhost:7071';

    try {
      const response = await fetch(`${medicalRecordsUrl}/appointment-types/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Call': 'true',
        },
        body: JSON.stringify({ tenantUuid }),
      });

      if (!response.ok) {
        this.logger.error(
          `Error al inicializar datos del tenant ${tenantUuid}: HTTP ${response.status}`,
        );
      } else {
        this.logger.log(`Datos del tenant ${tenantUuid} inicializados correctamente`);
      }
    } catch (error) {
      this.logger.error(
        `Fallo al inicializar datos del tenant ${tenantUuid}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
