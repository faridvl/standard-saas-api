// packages/identity/src/domain/use-cases/users/create-user.use-case.ts
import * as bcrypt from 'bcrypt';
import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { CreateUserParams, UserStorage } from '../../infrastructure/adapters/user.storage';
import { CreateUserDto } from '../dtos/create-user.dto';
import { OWNER_ONLY_MESSAGE, resolveUserAdmin } from '../policies/user-admin.policy';
import { diffAccess } from '../utils/user-audit.util';
import { UserActor, UserDomain, UserRole, UserStatus } from '../types/user.types';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(dto: CreateUserDto, actor: UserActor): Promise<UserDomain> {
    const admin = await resolveUserAdmin(this.userStorage, actor);

    const isOwner = admin.role === UserRole.OWNER;
    const needsOwner =
      dto.role === UserRole.OWNER || dto.attendsPatients || dto.specialties.length > 0;
    if (needsOwner && !isOwner) throw new ForbiddenException(OWNER_ONLY_MESSAGE);

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
      attendsPatients: dto.attendsPatients,
      specialties: dto.attendsPatients ? dto.specialties : [],
      phoneNumber: dto.phoneNumber || null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    };

    const audit = diffAccess(
      admin,
      { role: null, attendsPatients: false, specialties: [] },
      saveParams,
    );
    return await this.userStorage.save(saveParams, audit);
  }
}
