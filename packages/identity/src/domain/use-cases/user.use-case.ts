// packages/identity/src/domain/use-cases/users/create-user.use-case.ts
import * as bcrypt from 'bcrypt';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserParams, UserStorage } from '../../infrastructure/adapters/user.storage';
import { CreateUserDto } from '../dtos/create-user.dto';
import { resolveUserAdmin } from '../policies/user-admin.policy';
import { UserActor, UserDomain, UserStatus } from '../types/user.types';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(dto: CreateUserDto, actor: UserActor): Promise<UserDomain> {
    await resolveUserAdmin(this.userStorage, actor);

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.userStorage.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const saveParams: CreateUserParams = {
      email,
      fullName: dto.fullName,
      password: hashedPassword,
      role: dto.role,
      tenantId: actor.tenantId,
      tenantUUID: actor.tenantUuid,
      specialty: dto.specialty || null,
      phoneNumber: dto.phoneNumber || null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    };

    return await this.userStorage.save(saveParams);
  }
}
