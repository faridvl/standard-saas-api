import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard, CurrentUser, JwtPayload, StorageService, imageAndPdfFilter } from '@project/core';
import { UpdateUserUseCase } from '../../domain/use-cases/users/update-user.use-case';
import { UpdateTenantUseCase } from '../../domain/use-cases/tenants/update-tenant.use-case';

const UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  fileFilter: imageAndPdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
};

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateTenantUseCase: UpdateTenantUseCase,
  ) {}

  @Post('tenants/:uuid/logo')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadTenantLogo(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload('identity', currentUser.tenantUuid, 'logos', file);
    await this.updateTenantUseCase.execute(uuid, currentUser.tenantUuid, { logoUrl: url });
    return { url };
  }

  @Post('users/:uuid/signature')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadUserSignature(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload(
      'identity',
      currentUser.tenantUuid,
      'signatures',
      file,
      uuid,
    );
    await this.updateUserUseCase.execute(uuid, currentUser.tenantUuid, { signatureUrl: url });
    return { url };
  }

  @Post('users/:uuid/avatar')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadUserAvatar(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload(
      'identity',
      currentUser.tenantUuid,
      'avatars',
      file,
      uuid,
    );
    await this.updateUserUseCase.execute(uuid, currentUser.tenantUuid, { signatureUrl: url });
    return { url };
  }
}
