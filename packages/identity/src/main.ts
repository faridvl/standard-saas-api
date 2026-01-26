import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core'; // Importamos 'env' del core
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule);

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
