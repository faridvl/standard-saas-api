import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  UsePipes,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { ProductManagerUseCase } from '@medical-records/domain/use-cases/inventory/inventory.use-case';
import { ProductDto, ProductSchema } from '../dtos/inventory.dto';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private readonly productManager: ProductManagerUseCase) {}

  @Post()
  @UsePipes(new ZodValidationPipe(ProductSchema))
  async create(@Body() dto: ProductDto, @CurrentUser() user: JwtPayload) {
    return await this.productManager.create(user.tenantUuid, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('includeInactive') includeInactive: string,
  ) {
    return await this.productManager.listAll(user.tenantUuid, includeInactive === 'true');
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.productManager.getDetail(user.tenantUuid, uuid);
  }

  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: Partial<ProductDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.productManager.update(user.tenantUuid, uuid, dto);
  }

  @Delete(':uuid')
  async deactivate(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.productManager.toggleStatus(user.tenantUuid, uuid, false);
  }
}
