import { Controller, Post, Body, UsePipes, UseGuards, Get, Req } from '@nestjs/common';
import { RegisterTenantUseCase } from '../../domain/use-cases/register-tenant.use-case';
import { RegisterTenantDto, RegisterTenantSchema } from '../../domain/dtos/register-tenant.dto';
import { ZodValidationPipe } from '@project/core';
import { IRegistrationResult } from '../../domain/dtos/registration-result.interface';
import { LoginUseCase } from '../../domain/use-cases/login.use-case';
import { AuthGuard } from '../../infrastructure/security/auth.guard';

@Controller('auth')
export class OwnerController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterTenantUseCase,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterTenantSchema))
  async register(@Body() dto: RegisterTenantDto): Promise<IRegistrationResult> {
    // Aquí 'dto' ya viene validado y con el tipo correcto
    return await this.registerUseCase.execute(dto);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.loginUseCase.execute(body);
  }

  @UseGuards(AuthGuard) // <--- Protegemos este endpoint específico
  @Get('test')
  async testToken(@Req() req: any) {
    return {
      message: 'Tu token es válido',
      userData: req.user, // Aquí verás lo que metimos en el payload (sub, email, role)
    };
  }
}
