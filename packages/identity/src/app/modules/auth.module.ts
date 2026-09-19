import { Module } from '@nestjs/common';
import { AuthController } from '../controllers/auth.controller';
import { RegisterTenantUseCase } from '../../domain/use-cases/register-tenant.use-case';
import { LoginUseCase } from '../../domain/use-cases/login.use-case';
import { GetMeUseCase } from '../../domain/use-cases/auth/get-me.use-case';
import { BcryptService } from '../../infrastructure/security/bcrypt.service';
import { UsersModule } from './users.module';
import { TenantsModule } from './tenants.module';

const CONTROLLERS = [AuthController];
const USE_CASES = [RegisterTenantUseCase, LoginUseCase, GetMeUseCase];
const SERVICES = [BcryptService];

@Module({
  imports: [UsersModule, TenantsModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...SERVICES],
  exports: [...USE_CASES],
})
export class AuthModule {}
