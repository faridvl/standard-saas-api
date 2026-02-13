import { Module } from '@nestjs/common';
import { OwnerController } from './controllers/owner.controller';
import { CreateOwnerUseCase } from '../domain/use-cases/create-owner.use-case';
import { OwnerStorage } from '../infrastructure/adapters/owner.storage';
import { PrismaService } from '../infrastructure/adapters/prisma/prisma.service';
import { RegisterTenantUseCase } from '../domain/use-cases/register-tenant.use-case';
import { TenantStorage } from '../infrastructure/adapters/tenant.storage';
import { UserStorage } from '../infrastructure/adapters/user.storage';
import { BcryptService } from '../infrastructure/security/bcrypt.service';
import { JwtModule } from '@nestjs/jwt';
import { LoginUseCase } from '../domain/use-cases/login.use-case';

const USE_CASES = [RegisterTenantUseCase, LoginUseCase];
const STORAGES = [TenantStorage, UserStorage, PrismaService];
const SERVICES = [BcryptService];

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [OwnerController],
  providers: [...USE_CASES, ...STORAGES, ...SERVICES],
  exports: [...USE_CASES],
})
export class IdentityModule {}
