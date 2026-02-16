import { NestFactory } from '@nestjs/core';
import { MedicalRecordsModule } from './app/medical-records.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MedicalRecordsModule);
  app.enableCors({
    origin:
      env.NODE_ENV === 'development'
        ? '*' // Permite todo en desarrollo (opcional)
        : [''], // Lista blanca en producción
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = env.PORT || 7071;

  await app.listen(port);

  Logger.log(
    `🚀 Medical Records Service running on http://localhost:${port} [${env.NODE_ENV}]`,
    'Bootstrap',
  );
}
bootstrap();
