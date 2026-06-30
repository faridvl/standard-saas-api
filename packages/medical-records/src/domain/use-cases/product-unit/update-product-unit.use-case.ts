import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { UpdateProductUnitDto } from '@medical-records/app/dtos/product-unit.dto';
import { ProductUnit } from '@medical-records/domain/types/product.types';

@Injectable()
export class UpdateProductUnitUseCase {
  constructor(private readonly unitStorage: ProductUnitStorage) {}

  async execute(uuid: string, dto: UpdateProductUnitDto): Promise<ProductUnit> {
    const unit = await this.unitStorage.findOne(uuid);
    if (!unit) throw new NotFoundException('Unidad no encontrada');

    if (dto.status === 'AVAILABLE' && unit.status === 'ASSIGNED') {
      throw new BadRequestException('No se puede marcar como disponible una unidad asignada a un paciente. Use la opción de devolución.');
    }

    return this.unitStorage.update(uuid, dto);
  }
}
