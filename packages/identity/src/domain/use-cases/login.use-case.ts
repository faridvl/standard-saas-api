import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { BcryptService } from '../../infrastructure/security/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../../app/dtos/login.dto';
import { JwtPayload } from '@project/core';
import { UserStatus } from '../types/user.types';

export type LoginResult = {
  access_token: string;
  user: {
    name: string;
    email: string;
    tenantUuid: string;
    role?: string | null;
    attendsPatients: boolean;
    specialties: string[];
    professionalTitle?: string | null;
    licenseNumber?: string | null;
  };
};

type SessionUser = {
  uuid: string;
  email: string;
  name: string;
  role?: string | null;
  status: UserStatus;
  tenantId: number;
  tenantUuid: string;
  attendsPatients: boolean;
  specialties: string[];
  professionalTitle?: string | null;
  licenseNumber?: string | null;
};

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userStorage.findByEmail(dto.email);

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await this.bcryptService.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    // Mismo mensaje que una clave mala para no revelar que la cuenta existe.
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('Credenciales inválidas');

    return this.buildSession(user);
  }

  /** Reemite el token con el acceso actual de la base: un cambio de nivel aplica sin esperar la hora de vida del token. */
  async refresh(userUuid: string, tenantUuid: string): Promise<LoginResult> {
    const user = await this.userStorage.findByUuidAndTenant(userUuid, tenantUuid);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildSession({
      uuid: user.uuid,
      email: user.email,
      name: user.fullName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      tenantUuid,
      attendsPatients: user.attendsPatients,
      specialties: user.specialties,
      professionalTitle: user.professionalTitle,
      licenseNumber: user.licenseNumber,
    });
  }

  private async buildSession(user: SessionUser): Promise<LoginResult> {
    const payload: JwtPayload = {
      sub: user.uuid,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantUuid: user.tenantUuid,
      attendsPatients: user.attendsPatients,
      specialties: user.specialties,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        name: user.name,
        email: user.email,
        tenantUuid: user.tenantUuid,
        role: user.role,
        attendsPatients: user.attendsPatients,
        specialties: user.specialties,
        professionalTitle: user.professionalTitle ?? null,
        licenseNumber: user.licenseNumber ?? null,
      },
    };
  }
}
