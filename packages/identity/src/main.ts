import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 7170;

  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  await app.listen(port, '0.0.0.0');

  const displayUrl = host === 'localhost' ? `http://localhost:${port}` : `Puerto ${port}`;
  Logger.log(`🚀 Identity Service running on ${displayUrl}`, 'Bootstrap');
}

bootstrap();
