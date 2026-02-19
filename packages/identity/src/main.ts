import { NestFactory } from '@nestjs/core';
import { IdentityModule } from './app/identity.module';
import { GlobalExceptionFilter, env } from '@project/core';
import { Logger } from '@nestjs/common';

// Variable global para persistir la aplicación entre llamadas
let cachedApp: any;

async function createServer() {
  if (cachedApp) return cachedApp; // Si ya existe, no la vuelvas a crear

  const app = await NestFactory.create(IdentityModule);

  app.enableCors({
    origin: env.NODE_ENV === 'development' ? '*' : ['https://next-audiology-files.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  cachedApp = app; // Guardamos en cache
  return app;
}

export const handler = async (req: any, res: any) => {
  const app = await createServer();
  const instance = app.getHttpAdapter().getInstance();

  return new Promise((resolve, reject) => {
    instance(req, res, (err: any) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};

// Lógica para local
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function bootstrap() {
    const app = await createServer();
    const port = env.PORT || 7170; // Tu puerto local
    await app.listen(port);
    Logger.log(`🚀 Identity Service local on http://localhost:${port}`, 'Bootstrap');
  }
  bootstrap();
}

export default createServer;
