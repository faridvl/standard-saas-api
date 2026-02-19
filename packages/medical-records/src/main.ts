import { NestFactory } from '@nestjs/core';
import { MedicalRecordsModule } from './app/medical-records.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MedicalRecordsModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'development' ? '*' : ['https://next-audiology-files.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 7071;
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 Medical Records running on port ${port}`, 'Bootstrap');
}

bootstrap();
