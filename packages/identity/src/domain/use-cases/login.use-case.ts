import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { BcryptService } from '../../infrastructure/security/bcrypt.service';
import { LoginDto } from '../../app/dtos/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userStorage.findByEmail(dto.email);

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await this.bcryptService.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    const payload = {
      sub: user.uuid,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        name: user.name,
        email: user.email,
      },
    };
  }
}
