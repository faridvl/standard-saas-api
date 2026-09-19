import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../infrastructure/adapters/prisma/prisma.module';
import { AuthModule } from './modules/auth.module';
import { UsersModule } from './modules/users.module';
import { TenantsModule } from './modules/tenants.module';
import { UploadModule } from './modules/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    UploadModule,
  ],
})
export class IdentityModule {}
