import { Module } from '@nestjs/common';
import { UserStorage } from '@medical-records/infrastructure/adapters/userRepository/user.storage';
import { IdentityRepository } from '@medical-records/infrastructure/adapters/identityRepository/identity.repository';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users';

const USE_CASES = [GetOrCreateUserUseCase];
const STORAGES = [UserStorage, IdentityRepository];

@Module({
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class UsersModule {}
