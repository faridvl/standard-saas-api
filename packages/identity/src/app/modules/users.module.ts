import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { CreateUserUseCase } from '../../domain/use-cases/user.use-case';
import { GetUsersUseCase } from '../../domain/use-cases/users/get-users.use-case';
import { FindOneUserUseCase } from '../../domain/use-cases/users/find-one-user.use-case';
import { GetUserSignatureUseCase } from '../../domain/use-cases/users/get-user-signature.use-case';
import { UpdateUserUseCase } from '../../domain/use-cases/users/update-user.use-case';
import { DeleteUserUseCase } from '../../domain/use-cases/users/delete-user.use-case';
import { SetUserStatusUseCase } from '../../domain/use-cases/users/set-user-status.use-case';
import { ResetUserPasswordUseCase } from '../../domain/use-cases/users/reset-user-password.use-case';
import { ChangeOwnPasswordUseCase } from '../../domain/use-cases/users/change-own-password.use-case';
import { GetUserAuditUseCase } from '../../domain/use-cases/users/get-user-audit.use-case';
import { UserStorage } from '../../infrastructure/adapters/user.storage';

const CONTROLLERS = [UserController];
const USE_CASES = [
  CreateUserUseCase,
  GetUsersUseCase,
  FindOneUserUseCase,
  GetUserSignatureUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  SetUserStatusUseCase,
  ResetUserPasswordUseCase,
  ChangeOwnPasswordUseCase,
  GetUserAuditUseCase,
];
const STORAGES = [UserStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class UsersModule {}
