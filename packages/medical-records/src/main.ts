import { NestFactory } from '@nestjs/core';
import { MedicalRecordsModule } from './app/medical-records.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MedicalRecordsModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['https://next-audiology-files.vercel.app'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 7071;
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 Medical Records running on port ${port}`, 'Bootstrap');
}

bootstrap();
