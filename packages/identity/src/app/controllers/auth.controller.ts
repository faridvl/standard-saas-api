import { Controller, Post, Body, UsePipes, UseGuards, Get } from '@nestjs/common';
import { RegisterTenantUseCase } from '../../domain/use-cases/register-tenant.use-case';
import { RegisterTenantDto, RegisterTenantSchema } from '../../domain/dtos/register-tenant.dto';
import { LoginUseCase, LoginResult } from '../../domain/use-cases/login.use-case';
import { IRegistrationResult } from '../../domain/dtos/registration-result.interface';
import { ZodValidationPipe, AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { GetMeUseCase, GetMeResult } from '../../domain/use-cases/auth/get-me.use-case';
import { LoginDto } from '../dtos/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterTenantUseCase,
    private readonly getMeUseCase: GetMeUseCase,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterTenantSchema))
  async register(@Body() dto: RegisterTenantDto): Promise<IRegistrationResult> {
    return await this.registerUseCase.execute(dto);
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResult> {
    return this.loginUseCase.execute(body);
  }

  @UseGuards(AuthGuard)
  @Get('test')
  async testToken(@CurrentUser() user: JwtPayload): Promise<{
    message: string;
    userUuid: string;
    email: string;
    tenant: string;
    fullData: JwtPayload;
  }> {
    return {
      message: 'Tu token es válido y centralizado',
      userUuid: user.sub,
      email: user.email,
      tenant: user.tenantUuid,
      fullData: user,
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload): Promise<GetMeResult> {
    return await this.getMeUseCase.execute({
      userUuid: user.sub,
      tenantUuid: user.tenantUuid,
    });
  }

  @Get('health')
  healthCheck(): {
    status: string;
    timestamp: string;
    environment?: string;
    message: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'NestJS está respondiendo correctamente sin base de datos',
    };
  }
}
