import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core'; // Importamos 'env' del core
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule);
  app.enableCors({
    origin:
      env.NODE_ENV === 'development'
        ? '*' // Permite todo en desarrollo (opcional)
        : [''], // Lista blanca en producción
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  // 1. Filtro global de errores (ya centralizado)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 2. Usamos el puerto desde nuestro objeto validado
  const port = env.PORT;

  await app.listen(port);

  Logger.log(
    `🚀 Identity Service running on http://localhost:${port} [${env.NODE_ENV}]`,
    'Bootstrap',
  );
}
bootstrap();
