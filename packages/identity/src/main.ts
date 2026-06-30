import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['https://next-audiology-files.vercel.app'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 7170;

  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  await app.listen(port, '0.0.0.0');

  const displayUrl = host === 'localhost' ? `http://localhost:${port}` : `Puerto ${port}`;
  Logger.log(`🚀 Identity Service running on ${displayUrl}`, 'Bootstrap');
}

bootstrap();
