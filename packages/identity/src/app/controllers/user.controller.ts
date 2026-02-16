import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateUserUseCase } from '../../domain/use-cases/user.use-case';
import { CreateUserDto, CreateUserSchema } from '../../domain/dtos/create-user.dto';
import { GetUsersUseCase } from '../../domain/use-cases/users/get-users.use-case';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
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
}
