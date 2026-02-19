import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

let cachedHandler: any;

async function createServer() {
  if (cachedHandler) return cachedHandler;

  const app = await NestFactory.create(IdentityModule, {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();

  cachedHandler = app.getHttpAdapter().getInstance();
  return cachedHandler;
}

export const handler = async (req: any, res: any) => {
  const server = await createServer();

  return new Promise((resolve, reject) => {
    server(req, res, (err: any) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function bootstrap() {
    const app = await NestFactory.create(IdentityModule);

    app.enableCors({ origin: '*' });
    app.useGlobalFilters(new GlobalExceptionFilter());

    const port = env.PORT || 7170;
    await app.listen(port);
    Logger.log(`🚀 Identity Service local on http://localhost:${port}`, 'Bootstrap');
  }
  bootstrap();
}

export default createServer;
