import { Injectable } from '@nestjs/common';
import { AppLogger } from '@project/core';
import { OwnerStorage } from '../../infrastructure/adapters/owner.storage';
import { CreateOwnerDto } from '../dtos/create-owner.dto';
import { IOwner } from '../entities/owner.entity';
import { randomUUID as uuid } from 'crypto';

@Injectable()
export class CreateOwnerUseCase {
  private readonly logger = new AppLogger();

  constructor(private readonly storage: OwnerStorage) {
    this.logger.setContext(CreateOwnerUseCase.name);
  }

  async execute(dto: CreateOwnerDto): Promise<IOwner> {
    this.logger.log('Iniciando proceso de creación de Owner', { email: dto.email });

    try {
      /**
       * 🔐 SECCIÓN DE ENCRIPTACIÓN (Pendiente)
       * El UseCase es el lugar ideal para esto.
       */
      const hashedPassword = dto.password;

      const owner: IOwner = {
        uuid: uuid(),
        businessName: dto.businessName,
        email: dto.email,
        password: hashedPassword,
        createdAt: new Date(),
      };

      // Esperamos el resultado del storage
      const result = await this.storage.save(owner);

      this.logger.log('Owner guardado exitosamente', { uuid: result.uuid });

      return result; // <--- Retorno obligatorio exitoso
    } catch (error) {
      this.logger.error(
        'Error al guardar el Owner en Storage',
        error instanceof Error ? error.stack : undefined,
        { dto },
      );

      // Al hacer throw, TypeScript entiende que la función no "termina" con undefined,
      // sino que se interrumpe, cumpliendo con el contrato del return type.
      throw error;
    }
  }
}
