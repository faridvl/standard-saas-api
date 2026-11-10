import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantReferenceChecker } from '../tenant/tenant-reference.checker';

@Global()
@Module({
  providers: [PrismaService, TenantReferenceChecker],
  exports: [PrismaService, TenantReferenceChecker],
})
export class PrismaModule {}
