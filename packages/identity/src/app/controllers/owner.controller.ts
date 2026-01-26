import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { CreateOwnerUseCase } from '../../domain/use-cases/create-owner.use-case';
import { CreateOwnerDto } from '../../domain/dtos/create-owner.dto';
import { ZodValidationPipe } from '@project/core';
import { CreateOwnerSchema } from '../../domain/validations/create-owner.schema';

@Controller('owners')
export class OwnerController {
  constructor(private readonly createOwnerUseCase: CreateOwnerUseCase) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateOwnerSchema))
  async create(@Body() dto: CreateOwnerDto) {
    return await this.createOwnerUseCase.execute(dto);
  }
}
