import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Creamos la aplicación de NestJS de forma normal
  const app = await NestFactory.create(IdentityModule, {
    logger: ['log', 'error', 'warn', 'debug'], // Habilitamos logs para ver el arranque en Railway
  });

  // Configuración global
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Railway inyecta automáticamente la variable PORT.
  // Es vital escuchar en '0.0.0.0' para que sea accesible externamente.
  const port = process.env.PORT || 7170;

  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 Identity Service running on port ${port}`, 'Bootstrap');
}

bootstrap();
