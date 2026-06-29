import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { RegisterTenantUseCase } from '../domain/use-cases/register-tenant.use-case';
import { LoginUseCase } from '../domain/use-cases/login.use-case';
import { TenantStorage } from '../infrastructure/adapters/tenant.storage';
import { UserStorage } from '../infrastructure/adapters/user.storage';
import { PrismaService } from '../infrastructure/adapters/prisma/prisma.service';
import { BcryptService } from '../infrastructure/security/bcrypt.service';
import { GetMeUseCase } from '../domain/use-cases/auth/get-me.use-case';
import { CreateUserUseCase } from '../domain/use-cases/user.use-case';
import { UserController } from './controllers/user.controller';
import { GetUsersUseCase } from '../domain/use-cases/users/get-users.use-case';
import { FindOneUserUseCase } from '../domain/use-cases/users/find-one-user.use-case';
import { UpdateUserUseCase } from '../domain/use-cases/users/update-user.use-case';
import { TenantController } from './controllers/tenant.controller';
import { UpdateTenantUseCase } from '../domain/use-cases/tenants/update-tenant.use-case';
import { DeleteUserUseCase } from '../domain/use-cases/users/delete-user.use-case';
import { UploadController } from './controllers/upload.controller';
import { StorageModule } from '@project/core';

const CONTROLLERS = [AuthController, UserController, TenantController, UploadController];
const USE_CASES = [
  RegisterTenantUseCase,
  LoginUseCase,
  GetMeUseCase,
  CreateUserUseCase,
  GetUsersUseCase,
  FindOneUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  UpdateTenantUseCase,
];
const STORAGES = [TenantStorage, UserStorage, PrismaService];
const SERVICES = [BcryptService];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StorageModule,

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES, ...SERVICES],
  exports: [...USE_CASES],
})
export class IdentityModule {}
