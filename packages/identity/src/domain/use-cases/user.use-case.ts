// packages/identity/src/domain/use-cases/users/create-user.use-case.ts
import * as bcrypt from 'bcrypt';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserParams, UserStorage } from '../../infrastructure/adapters/user.storage';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UserDomain } from '../types/user.types';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(
    dto: CreateUserDto,
    extra: { tenantId: number; tenantUUID: string },
  ): Promise<UserDomain> {
    const existingUser = await this.userStorage.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const saveParams: CreateUserParams = {
      email: dto.email,
      fullName: dto.fullName,
      password: hashedPassword,
      role: dto.role,
      tenantId: extra.tenantId,
      tenantUUID: extra.tenantUUID,
      specialty: dto.specialty || null,
      phoneNumber: dto.phoneNumber || null,
      avatarUrl: null,
      status: 'ACTIVE',
    };

    return await this.userStorage.save(saveParams);
  }
}
