import { Module } from '@nestjs/common';
import { OwnerController } from './controllers/owner.controller';
import { CreateOwnerUseCase } from '../domain/use-cases/create-owner.use-case';
import { OwnerStorage } from '../infrastructure/adapters/owner.storage';
import { PrismaService } from '../infrastructure/adapters/prisma/prisma.service';

@Module({
  controllers: [OwnerController],
  providers: [PrismaService, CreateOwnerUseCase, OwnerStorage],
})
export class IdentityModule {}
