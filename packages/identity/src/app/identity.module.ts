// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { JwtModule } from '@nestjs/jwt';
// import { AuthController } from './controllers/auth.controller';
// import { RegisterTenantUseCase } from '../domain/use-cases/register-tenant.use-case';
// import { LoginUseCase } from '../domain/use-cases/login.use-case';
// import { TenantStorage } from '../infrastructure/adapters/tenant.storage';
// import { UserStorage } from '../infrastructure/adapters/user.storage';
// import { PrismaService } from '../infrastructure/adapters/prisma/prisma.service';
// import { BcryptService } from '../infrastructure/security/bcrypt.service';
// import { GetMeUseCase } from '../domain/use-cases/auth/get-me.use-case';
// import { CreateUserUseCase } from '../domain/use-cases/user.use-case';
// import { UserController } from './controllers/user.controller';
// import { GetUsersUseCase } from '../domain/use-cases/users/get-users.use-case';

// const CONTROLLERS = [AuthController, UserController];
// const USE_CASES = [
//   RegisterTenantUseCase,
//   LoginUseCase,
//   GetMeUseCase,
//   CreateUserUseCase,
//   GetUsersUseCase,
// ];
// const STORAGES = [TenantStorage, UserStorage, PrismaService];
// const SERVICES = [BcryptService];

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }),

//     JwtModule.registerAsync({
//       global: true,
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         secret: configService.get<string>('JWT_SECRET'),
//         signOptions: { expiresIn: '1h' },
//       }),
//     }),
//   ],
//   controllers: [...CONTROLLERS],
//   providers: [...USE_CASES, ...STORAGES, ...SERVICES],
//   exports: [...USE_CASES],
// })
// export class IdentityModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/healt.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // JWT y otros módulos pesados comentados para el test
  ],
  controllers: [HealthController],
  providers: [], // Vacío para evitar cargar PrismaService o UseCases
})
export class IdentityModule {}
