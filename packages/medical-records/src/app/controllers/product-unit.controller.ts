import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  CreateProductUnitDto,
  CreateProductUnitSchema,
  CreateProductUnitsBulkDto,
  CreateProductUnitsBulkSchema,
  UpdateProductUnitDto,
  UpdateProductUnitSchema,
} from '../dtos/product-unit.dto';
import { CreateProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/create-product-unit.use-case';
import { CreateProductUnitsBulkUseCase } from '@medical-records/domain/use-cases/product-unit/create-product-units-bulk.use-case';
import { FindProductUnitsUseCase } from '@medical-records/domain/use-cases/product-unit/find-product-units.use-case';
import { FindOneProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/find-one-product-unit.use-case';
import { UpdateProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/update-product-unit.use-case';
import { ProductUnitStatus } from '@medical-records/domain/types/product.types';

@Controller()
@UseGuards(AuthGuard)
export class ProductUnitController {
  constructor(
    private readonly createUseCase: CreateProductUnitUseCase,
    private readonly createBulkUseCase: CreateProductUnitsBulkUseCase,
    private readonly findAllUseCase: FindProductUnitsUseCase,
    private readonly findOneUseCase: FindOneProductUnitUseCase,
    private readonly updateUseCase: UpdateProductUnitUseCase,
  ) {}

  @Post('products/:productUuid/units')
  @UsePipes(new ZodValidationPipe(CreateProductUnitSchema))
  async create(
    @Param('productUuid') productUuid: string,
    @Body() dto: CreateProductUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createUseCase.execute(productUuid, user.tenantUuid, dto);
  }

  @Post('products/:productUuid/units/bulk')
  @UsePipes(new ZodValidationPipe(CreateProductUnitsBulkSchema))
  async createBulk(
    @Param('productUuid') productUuid: string,
    @Body() dto: CreateProductUnitsBulkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createBulkUseCase.execute(productUuid, user.tenantUuid, dto.units);
  }

  @Get('products/:productUuid/units')
  async findAll(
    @Param('productUuid') productUuid: string,
    @Query('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const validStatuses: ProductUnitStatus[] = ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'RETIRED'];
    const statusFilter = validStatuses.includes(status as ProductUnitStatus)
      ? (status as ProductUnitStatus)
      : undefined;
    return this.findAllUseCase.execute(productUuid, user.tenantUuid, statusFilter);
  }

  @Get('product-units/:uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.findOneUseCase.execute(uuid);
  }

  @Patch('product-units/:uuid')
  @UsePipes(new ZodValidationPipe(UpdateProductUnitSchema))
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateProductUnitDto) {
    return this.updateUseCase.execute(uuid, dto);
  }
}
