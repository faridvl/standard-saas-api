import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateUserUseCase } from '../../domain/use-cases/user.use-case';
import { CreateUserDto, CreateUserSchema } from '../../domain/dtos/create-user.dto';
import { GetUsersUseCase } from '../../domain/use-cases/users/get-users.use-case';
import { FindOneUserUseCase } from '../../domain/use-cases/users/find-one-user.use-case';
import { UpdateUserUseCase } from '../../domain/use-cases/users/update-user.use-case';
import { UpdateUserDto, UpdateUserSchema } from '../../domain/dtos/update-user.dto';
import { DeleteUserUseCase } from '../../domain/use-cases/users/delete-user.use-case';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly findOneUserUseCase: FindOneUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: JwtPayload) {
    return await this.createUserUseCase.execute(dto, {
      tenantId: currentUser.tenantId,
      tenantUUID: currentUser.tenantUuid,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.getUsersUseCase.execute(currentUser.tenantUuid, Number(page), Number(limit));
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() currentUser: JwtPayload) {
    return await this.findOneUserUseCase.execute(uuid, currentUser.tenantUuid);
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdateUserSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return await this.updateUserUseCase.execute(uuid, currentUser.tenantUuid, dto);
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('uuid') uuid: string, @CurrentUser() currentUser: JwtPayload) {
    return await this.deleteUserUseCase.execute(uuid, currentUser.tenantUuid);
  }
}
