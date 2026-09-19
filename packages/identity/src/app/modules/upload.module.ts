import { Module } from '@nestjs/common';
import { StorageModule } from '@project/core';
import { UploadController } from '../controllers/upload.controller';
import { UsersModule } from './users.module';
import { TenantsModule } from './tenants.module';

@Module({
  imports: [StorageModule, UsersModule, TenantsModule],
  controllers: [UploadController],
})
export class UploadModule {}
