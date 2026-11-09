import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateUserUseCase } from '../../domain/use-cases/user.use-case';
import { CreateUserDto, CreateUserSchema } from '../../domain/dtos/create-user.dto';
import { GetUsersUseCase } from '../../domain/use-cases/users/get-users.use-case';
import { FindOneUserUseCase } from '../../domain/use-cases/users/find-one-user.use-case';
import { UpdateUserUseCase } from '../../domain/use-cases/users/update-user.use-case';
import { UpdateUserDto, UpdateUserSchema } from '../../domain/dtos/update-user.dto';
import { DeleteUserUseCase } from '../../domain/use-cases/users/delete-user.use-case';
import { SetUserStatusUseCase } from '../../domain/use-cases/users/set-user-status.use-case';
import { ResetUserPasswordUseCase } from '../../domain/use-cases/users/reset-user-password.use-case';
import {
  UpdateUserStatusDto,
  UpdateUserStatusSchema,
} from '../../domain/dtos/update-user-status.dto';
import {
  ResetUserPasswordDto,
  ResetUserPasswordSchema,
} from '../../domain/dtos/reset-user-password.dto';
import { GetUserAuditUseCase } from '../../domain/use-cases/users/get-user-audit.use-case';
import {
  ADMIN_ASSIGNABLE_ROLES,
  ASSIGNABLE_USER_ROLES,
  ProfessionalTitle,
  Specialty,
  UserAuditEntry,
  UserDomain,
} from '../../domain/types/user.types';
import { PaginatedResponse } from '../../domain/types/pagination.types';
import { toUserActor } from '../utils/user-actor.util';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly findOneUserUseCase: FindOneUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly setUserStatusUseCase: SetUserStatusUseCase,
    private readonly resetUserPasswordUseCase: ResetUserPasswordUseCase,
    private readonly getUserAuditUseCase: GetUserAuditUseCase,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserDomain> {
    return await this.createUserUseCase.execute(dto, toUserActor(currentUser));
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<UserDomain>> {
    return await this.getUsersUseCase.execute(
      toUserActor(currentUser),
      Number(page),
      Number(limit),
      status,
    );
  }

  @Get('catalogs')
  getCatalogs(): {
    roles: readonly string[];
    adminAssignableRoles: readonly string[];
    specialties: string[];
    professionalTitles: string[];
  } {
    return {
      roles: ASSIGNABLE_USER_ROLES,
      adminAssignableRoles: ADMIN_ASSIGNABLE_ROLES,
      specialties: Object.values(Specialty),
      professionalTitles: Object.values(ProfessionalTitle),
    };
  }

  @Get('audit')
  async findAudit(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('targetUuid') targetUuid?: string,
  ): Promise<PaginatedResponse<UserAuditEntry>> {
    return await this.getUserAuditUseCase.execute(
      toUserActor(currentUser),
      Number(page),
      Number(limit),
      targetUuid,
    );
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserDomain> {
    return await this.findOneUserUseCase.execute(uuid, currentUser.tenantUuid);
  }

  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserDomain> {
    return await this.updateUserUseCase.execute(uuid, toUserActor(currentUser), dto);
  }

  @Patch(':uuid/status')
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body(new ZodValidationPipe(UpdateUserStatusSchema)) dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserDomain> {
    return await this.setUserStatusUseCase.execute(uuid, dto.status, toUserActor(currentUser));
  }

  @Put(':uuid/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Param('uuid') uuid: string,
    @Body(new ZodValidationPipe(ResetUserPasswordSchema)) dto: ResetUserPasswordDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.resetUserPasswordUseCase.execute(uuid, dto.password, toUserActor(currentUser));
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: JwtPayload): Promise<void> {
    await this.deleteUserUseCase.execute(uuid, toUserActor(currentUser));
  }
}
